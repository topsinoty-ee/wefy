import {HttpMethod, SanitizeUrlOptions, WefyConfig, WefyRequestConfig} from "@/core/types.ts";
import {createSignal, resolveFetch, sanitizeUrl} from "@/core/utils.ts";
import {WefyParseError, WefyTimeoutError} from "@/core/error.ts";
import {WefyResponse} from "@/core/response.ts";

abstract class HttpMethodsBase<ReturnType = unknown> {
  get<ResponseData = ReturnType>(path: string, config?: WefyRequestConfig): Promise<ResponseData> {
    return this.makeRequest<ResponseData>('GET', path, undefined, config);
  }
  
  post<ResponseData = ReturnType, RequestData extends RequestInit['body' ] = undefined>(path: string, body?: RequestData, config?: WefyRequestConfig): Promise<ResponseData> {
    return this.makeRequest<ResponseData, RequestData>('POST', path, body, config);
  }
  
  put<ResponseData = ReturnType, RequestData extends RequestInit['body' ] = undefined>(path: string, body?: RequestData, config?: WefyRequestConfig): Promise<ResponseData> {
    return this.makeRequest<ResponseData, RequestData>('PUT', path, body, config);
  }
  
  patch<ResponseData = ReturnType, RequestData extends RequestInit['body' ] = undefined>(path: string, body?: RequestData, config?: WefyRequestConfig): Promise<ResponseData> {
    return this.makeRequest<ResponseData, RequestData>('PATCH', path, body, config);
  }
  
  delete<ResponseData = ReturnType>(path: string, config?: WefyRequestConfig): Promise<ResponseData> {
    return this.makeRequest<ResponseData>('DELETE', path, undefined, config);
  }
  
  protected abstract makeRequest<ResponseData = ReturnType, RequestData extends RequestInit['body'] = undefined>(method: HttpMethod, path: string, body?: RequestData, config?: WefyRequestConfig): Promise<ResponseData>;
}

class WefyRaw extends HttpMethodsBase {
  constructor(private wefy: Wefy) {
    super();
  }
  
  protected async makeRequest<ResponseData, RequestData extends RequestInit['body']>(method: HttpMethod, path: string, body?: RequestData, config?: WefyRequestConfig): Promise<ResponseData> {
    const response = await this.wefy.request<ResponseData, RequestData>(method, path, body, config, true);
    return response as ResponseData;
  }
}

class Wefy extends HttpMethodsBase {
  public readonly raw: WefyRaw;
  private readonly fetch: typeof fetch;
  
  private constructor(private readonly config: WefyConfig) {
    super();
    this.validateConfig(config);
    this.config = {
      ...config, timeout: config.timeout ?? 5000
    };
    this.fetch = resolveFetch();
    this.raw = new WefyRaw(this);
  }
  
  static create(config: WefyConfig | string): Wefy {
    return new Wefy(typeof config === "string" ? {baseUrl: config} : config);
  }
  
  async request<ResponseData = unknown, RequestBody extends RequestInit['body'] = undefined>(method: HttpMethod, path: string, body?: RequestBody, config?: WefyRequestConfig, raw?: boolean): Promise<WefyResponse<ResponseData> | Response> {
    const timeout = config?.timeout ?? this.config.timeout;
    const controller = new AbortController();
    const {params} = config || {};
    
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
    
    try {
      const sanitizeOptions: SanitizeUrlOptions = {
        encode: config?.encode ?? true, preserveEncoding: config?.preserveEncoding ?? true
      };
      
      const isAbsoluteUrl = path.startsWith("https://") || path.startsWith("http://");
      const url = sanitizeUrl(isAbsoluteUrl ? path : this.config.baseUrl, isAbsoluteUrl ? "" : path, params, sanitizeOptions);
      
      const baseOptions = {...this.config.options};
      const requestOptions = {...config?.options};
      delete baseOptions?.headers;
      delete requestOptions?.headers;
      
      const fetchOptions: RequestInit = {
        ...baseOptions, ...requestOptions,
        method,
        headers: new Headers({
          ...this.config.options?.headers,
          ...config?.options?.headers
        }),
        body,
        signal: createSignal(controller.signal, config?.options?.signal, this.config.options?.signal).signal
      };
      
      const resPromise = this.fetch(url, fetchOptions).catch(error => {
        if (error.name === 'AbortError') {
          throw new WefyTimeoutError(timeout);
        }
        throw error;
      });
      
      if (raw) {
        return resPromise;
      }
      
      return new WefyResponse<ResponseData>(resPromise);
    } catch (error) {
      if (error instanceof WefyTimeoutError || error instanceof WefyParseError) {
        throw error;
      }
      
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Request failed: ${message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  public decorate<Name extends string, Config extends Partial<WefyConfig>>(
    name: Name,
    config: Config
  ): Wefy & { [K in Name]: Wefy } {
    Object.defineProperty(this, name, {
      value: new Wefy(this.mergeConfig(config)),
      writable: false,
      enumerable: true,
      configurable: false,
    });
    return this as Wefy & { [K in Name]: Wefy };
  }
  
  
  protected async makeRequest<ResponseData, RequestData extends RequestInit['body'] = undefined>(method: HttpMethod, path: string, body?: RequestData, config?: WefyRequestConfig): Promise<ResponseData> {
    const response = await this.request<ResponseData, RequestData>(method, path, body, config);
    return (response instanceof WefyResponse ? await response.auto() : response);
  }
  
  private validateConfig(config: WefyConfig): void {
    if (!config.baseUrl) {
      throw new Error('baseUrl is required');
    }
  }
}

export {Wefy};
