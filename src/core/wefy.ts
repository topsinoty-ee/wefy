import {HttpMethod, SanitizeUrlOptions, WefyConfig, WefyRequestConfig} from "@/core/types.ts";
import {createSignal, resolveFetch, sanitizeUrl} from "@/core/utils.ts";
import {WefyParseError, WefyTimeoutError} from "@/core/error.ts";
import {WefyResponse} from "@/core/response.ts";
import {produce} from "immer";

type BaseWefy = Omit<Wefy, 'decorate' | 'raw' | 'scope' | 'request'> & {
  raw: Omit<WefyRaw, 'makeRequest'>;
};

type ScopeMethod<Args extends unknown[] = unknown[], Return = unknown> = (...args: Args) => Return;

type DecoratedWefy = BaseWefy;

interface ScopeFactoryContext {
  get: <ResponseData = unknown>(path: string, config?: WefyRequestConfig) => Promise<ResponseData>;
  post: <ResponseData = unknown, RequestData extends RequestInit['body'] = undefined>(path: string, body?: RequestData, config?: WefyRequestConfig) => Promise<ResponseData>;
  put: <ResponseData = unknown, RequestData extends RequestInit['body'] = undefined>(path: string, body?: RequestData, config?: WefyRequestConfig) => Promise<ResponseData>;
  patch: <ResponseData = unknown, RequestData extends RequestInit['body'] = undefined>(path: string, body?: RequestData, config?: WefyRequestConfig) => Promise<ResponseData>;
  delete: <ResponseData = unknown>(path: string, config?: WefyRequestConfig) => Promise<ResponseData>;
  decorate: <Config extends Partial<WefyConfig>>(config: Config) => ScopeFactoryContext;
  state: Map<string, unknown>;
}

type ScopeInfo<T extends Record<string, ScopeMethod>> = {
  methods: T; state: Map<string, unknown>; config?: Partial<WefyConfig>;
};

abstract class HttpMethodsBase<ReturnType = unknown> {
  get<ResponseData = ReturnType>(path: string, config?: WefyRequestConfig): Promise<ResponseData> {
    return this.makeRequest<ResponseData>('GET', path, undefined, config);
  }
  
  post<ResponseData = ReturnType, RequestData extends RequestInit['body'] = undefined>(path: string, body?: RequestData, config?: WefyRequestConfig): Promise<ResponseData> {
    return this.makeRequest<ResponseData, RequestData>('POST', path, body, config);
  }
  
  put<ResponseData = ReturnType, RequestData extends RequestInit['body'] = undefined>(path: string, body?: RequestData, config?: WefyRequestConfig): Promise<ResponseData> {
    return this.makeRequest<ResponseData, RequestData>('PUT', path, body, config);
  }
  
  patch<ResponseData = ReturnType, RequestData extends RequestInit['body'] = undefined>(path: string, body?: RequestData, config?: WefyRequestConfig): Promise<ResponseData> {
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
  private scopes = new Map<string, ScopeInfo<Record<string, ScopeMethod>>>();
  
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
      
      // noinspection HttpUrlsUsage
      const isAbsoluteUrl = path.startsWith("https://") || path.startsWith("http://");
      const url = sanitizeUrl(isAbsoluteUrl ? path : this.config.baseUrl, isAbsoluteUrl ? "" : path, params, sanitizeOptions);
      
      const baseOptions = {...this.config.options};
      const requestOptions = {...config?.options};
      delete baseOptions?.headers;
      delete requestOptions?.headers;
      
      const fetchOptions: RequestInit = {
        ...baseOptions, ...requestOptions, method, headers: new Headers({
          ...this.config.options?.headers, ...config?.options?.headers
        }), body, signal: createSignal(controller.signal, config?.options?.signal, this.config.options?.signal).signal
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
  
  public decorate<Name extends string, Config extends Partial<WefyConfig>>(name: Name, config: Config): this & { [K in Name]: DecoratedWefy } {
    return produce(this, (draft) => {
      Object.defineProperty(draft, name, {
        value: new Wefy({
          ...this.config, ...config, options: {
            ...this.config.options, ...config.options, headers: new Headers({
              ...this.config.options?.headers, ...config.options?.headers,
            }),
          },
        }), writable: false, enumerable: true, configurable: false,
      });
    }) as this & { [K in Name]: DecoratedWefy };
  }
  
  scope<Name extends string, T extends Record<string, ScopeMethod>>(name: Name, methods: T, config?: Partial<WefyConfig>): this & { [K in Name]: T };
  
  scope<Name extends string, T extends Record<string, ScopeMethod>>(name: Name, fn: (ctx: ScopeFactoryContext) => T, config?: Partial<WefyConfig>): this & { [K in Name]: T };
  
  scope<Name extends string, T extends Record<string, ScopeMethod>>(name: Name, objOrFn: T | ((ctx: ScopeFactoryContext) => T), config?: Partial<WefyConfig>): this & { [K in Name]: T } {
    if (this.scopes.has(name)) {
      throw new Error(`Scope "${name}" already exists.`);
    }
    
    const scopedWefy = config ? Wefy.create({
      ...this.config, ...config, options: {
        ...this.config.options, ...config.options, headers: new Headers({
          ...this.config.options?.headers, ...config.options?.headers,
        }),
      },
    }) : this;
    
    const state = new Map<string, unknown>();
    
    const createContext = (wefy: Wefy): ScopeFactoryContext => ({
      get: wefy.get.bind(wefy),
      post: wefy.post.bind(wefy),
      put: wefy.put.bind(wefy),
      patch: wefy.patch.bind(wefy),
      delete: wefy.delete.bind(wefy),
      decorate: <DecConfig extends Partial<WefyConfig>>(decorateConfig: DecConfig): ScopeFactoryContext => {
        const newWefy = Wefy.create({
          ...wefy.config, ...decorateConfig, options: {
            ...wefy.config.options, ...decorateConfig.options, headers: new Headers({
              ...wefy.config.options?.headers, ...decorateConfig.options?.headers,
            }),
          },
        });
        return createContext(newWefy);
      },
      state,
    });
    
    const context = createContext(scopedWefy);
    
    const methods = typeof objOrFn === 'function' ? objOrFn(context) : objOrFn;
    
    const scopeInfo: ScopeInfo<T> = {methods, state, config};
    this.scopes.set(name, scopeInfo as ScopeInfo<Record<string, ScopeMethod>>);
    
    const newThis = produce(this, (draft) => {
      Object.defineProperty(draft, name, {
        value: methods, writable: false, enumerable: true, configurable: false,
      });
    });
    
    return newThis as this & { [K in Name]: T };
  }
  
  public getScopeInfo<T extends Record<string, ScopeMethod>>(name: string): ScopeInfo<T> | undefined {
    return this.scopes.get(name) as ScopeInfo<T> | undefined;
  }
  
  public hasScope(name: string): boolean {
    return this.scopes.has(name);
  }
  
  listScopes(): string[] {
    return Array.from(this.scopes.keys());
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