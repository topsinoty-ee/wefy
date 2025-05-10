import { WefyExtensionManager } from "@/extension/manager";
import { WefyError } from "./error";
import {
  HttpMethod,
  WefyConfig,
  WefyRequestConfig,
  Params,
  SanitizeUrlOptions,
} from "./types";
import { createSignal, resolveFetch, sanitizeUrl } from "./utils";

type HTTPRequestBody = BodyInit | Record<string, unknown> | null | undefined;
type EmptyRequestBody = Record<string, never>;

interface WefyResponse<ResponseData> extends Promise<ResponseData> {
  raw: () => Promise<Response>;
}

interface HTTPClientInterface {
  get<ResponseData = unknown, RequestQuery extends Params = Params>(
    endpoint: string,
    config?: Omit<WefyRequestConfig<EmptyRequestBody>, "body"> & {
      params?: RequestQuery;
    }
  ): WefyResponse<ResponseData>;

  post<
    ResponseData = unknown,
    RequestBody extends HTTPRequestBody = undefined,
    RequestQuery extends Params = Params
  >(
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): WefyResponse<ResponseData>;

  put<
    ResponseData = unknown,
    RequestBody extends HTTPRequestBody = undefined,
    RequestQuery extends Params = Params
  >(
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): WefyResponse<ResponseData>;

  patch<
    ResponseData = unknown,
    RequestBody extends HTTPRequestBody = undefined,
    RequestQuery extends Params = Params
  >(
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): WefyResponse<ResponseData>;

  delete<
    ResponseData = unknown,
    RequestBody extends HTTPRequestBody = undefined,
    RequestQuery extends Params = Params
  >(
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): WefyResponse<ResponseData>;

  head<ResponseData = unknown, RequestQuery extends Params = Params>(
    endpoint: string,
    config?: Omit<WefyRequestConfig<EmptyRequestBody>, "body"> & {
      params?: RequestQuery;
    }
  ): WefyResponse<ResponseData>;

  options<ResponseData = unknown, RequestQuery extends Params = Params>(
    endpoint: string,
    config?: Omit<WefyRequestConfig<EmptyRequestBody>, "body"> & {
      params?: RequestQuery;
    }
  ): WefyResponse<ResponseData>;
}

export class Wefy implements HTTPClientInterface {
  private readonly extensionManager?: WefyExtensionManager;

  private constructor(private readonly config: WefyConfig) {
    this.validateConfig(config);
    this.config.timeout = config.timeout ?? 5000;
    this.config.encode = config.encode ?? true;
    this.config.preserveEncoding = config.preserveEncoding ?? false;

    if (config.extensions?.use) {
      this.extensionManager = new WefyExtensionManager(config.extensions.use);
      this.extensionManager
        .initialize(config.extensions.config || {})
        .catch(console.error);
    }
  }

  static create(config: WefyConfig): Wefy;
  static create(baseUrl: string): Wefy;
  static create(config: WefyConfig | string): Wefy {
    resolveFetch();
    return new Wefy(typeof config === "string" ? { baseUrl: config } : config);
  }

  private validateConfig(config: WefyConfig): void {
    if (!config.baseUrl) throw new WefyError("Base URL is required");
    try {
      const url = new URL(config.baseUrl);
      if (!["http:", "https:"].includes(url.protocol))
        throw new WefyError("Only http and https protocols are supported");
    } catch (error) {
      if (error instanceof WefyError) throw error;
      throw new WefyError(`Invalid base URL format: ${error}`);
    }
  }

  public get<ResponseData = unknown, RequestQuery extends Params = Params>(
    endpoint: string,
    config?: Omit<WefyRequestConfig<EmptyRequestBody>, "body"> & {
      params?: RequestQuery;
    }
  ): WefyResponse<ResponseData> {
    return this.makeRequest<ResponseData, EmptyRequestBody, RequestQuery>(
      "GET",
      endpoint,
      config
    );
  }

  public post<
    ResponseData = unknown,
    RequestBody extends HTTPRequestBody = undefined,
    RequestQuery extends Params = Params
  >(
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): WefyResponse<ResponseData> {
    return this.makeRequest<ResponseData, RequestBody, RequestQuery>(
      "POST",
      endpoint,
      config
    );
  }

  public put<
    ResponseData = unknown,
    RequestBody extends HTTPRequestBody = undefined,
    RequestQuery extends Params = Params
  >(
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): WefyResponse<ResponseData> {
    return this.makeRequest("PUT", endpoint, config);
  }

  public patch<
    ResponseData = unknown,
    RequestBody extends HTTPRequestBody = undefined,
    RequestQuery extends Params = Params
  >(
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): WefyResponse<ResponseData> {
    return this.makeRequest("PATCH", endpoint, config);
  }

  public delete<
    ResponseData = unknown,
    RequestBody extends HTTPRequestBody = undefined,
    RequestQuery extends Params = Params
  >(
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): WefyResponse<ResponseData> {
    return this.makeRequest("DELETE", endpoint, config);
  }

  public head<ResponseData = unknown, RequestQuery extends Params = Params>(
    endpoint: string,
    config?: Omit<WefyRequestConfig<EmptyRequestBody>, "body"> & {
      params?: RequestQuery;
    }
  ): WefyResponse<ResponseData> {
    return this.makeRequest("HEAD", endpoint, config);
  }

  public options<ResponseData = unknown, RequestQuery extends Params = Params>(
    endpoint: string,
    config?: Omit<WefyRequestConfig<EmptyRequestBody>, "body"> & {
      params?: RequestQuery;
    }
  ): WefyResponse<ResponseData> {
    return this.makeRequest("OPTIONS", endpoint, config);
  }

  private makeRequest<
    ResponseData,
    RequestBody extends HTTPRequestBody,
    RequestQuery extends Params
  >(
    method: HttpMethod,
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): WefyResponse<ResponseData> {
    const timeoutMs = config?.timeout ?? this.config.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(`Request timed out after ${timeoutMs}ms`),
      timeoutMs
    );

    const sanitizeOptions: SanitizeUrlOptions = {
      encode: config?.encode ?? this.config.encode ?? true,
      preserveEncoding:
        config?.preserveEncoding ?? this.config.preserveEncoding ?? false,
    };

    const url = sanitizeUrl(
      this.config.baseUrl,
      endpoint,
      config?.params,
      sanitizeOptions
    );

    const headers = new Headers({
      ...this.config.options?.headers,
      ...config?.options?.headers,
    });
    let processedBody: BodyInit | undefined = undefined;

    if (this.methodCanContainBody(method)) {
      processedBody = this.processRequestBody<RequestBody>(
        headers,
        config?.body
      );
    }

    const { signal, cleanup } = createSignal(
      controller.signal,
      config?.options?.signal
    );

    const startTime = Date.now();
    let success = false;

    const requestDetails = {
      url: url.toString(),
      method,
      headers: Object.fromEntries(headers.entries()),
      body: processedBody,
    };

    const responsePromise = (async () => {
      try {
        if (this.extensionManager) {
          await this.extensionManager.executeHook("beforeRequest", {
            method,
            endpoint,
            config: config || {},
          });
        }

        if (this.extensionManager) {
          await this.extensionManager.executeHook("onRequest", requestDetails);
        }

        const response = await fetch(url.toString(), {
          ...this.config.options,
          ...config?.options,
          signal,
          credentials:
            config?.options?.credentials ??
            this.config.options?.credentials ??
            "same-origin",
          method,
          headers,
          body: processedBody,
        });

        if (this.extensionManager) {
          await this.extensionManager.executeHook("beforeResponse", {
            response,
            duration: Date.now() - startTime,
          });
        }

        const clone = response.clone();
        if (!response.ok) throw await this.createErrorFromResponse(clone);
        return clone;
      } catch (error) {
        throw error;
      }
    })();

    const dataPromise = (async (): Promise<ResponseData> => {
      try {
        const response = await responsePromise;
        const duration = Date.now() - startTime;

        const data = await this.unwrapResponseData<ResponseData>(
          response,
          method
        );

        if (this.extensionManager) {
          await this.extensionManager.executeHook("onResponse", {
            response,
            data,
          });
        }

        if (this.extensionManager) {
          await this.extensionManager.executeHook("afterSuccess", {
            response,
            data,
            duration,
          });
        }

        success = true;
        return data;
      } catch (error) {
        const errorContext = {
          method,
          endpoint,
          config,
          url: url.toString(),
          duration: Date.now() - startTime,
        };

        if (this.extensionManager) {
          await this.extensionManager.executeHook(
            "onError",
            error,
            errorContext
          );
        }

        throw error instanceof WefyError
          ? error
          : new WefyError(
              error instanceof Error ? error.message : "Unknown request error"
            );
      } finally {
        if (this.extensionManager) {
          await this.extensionManager.executeHook("afterRequest", {
            method,
            endpoint,
            config,
            duration: Date.now() - startTime,
            success,
          });
        }
        clearTimeout(timeoutId);
        cleanup();
      }
    })();

    return Object.assign(dataPromise, {
      raw: async () => (await responsePromise).clone(),
    });
  }

  private processRequestBody<RequestBody extends HTTPRequestBody>(
    headers: Headers,
    body?: RequestBody
  ): BodyInit | undefined {
    if (body === null || body === undefined) return undefined;
    if (
      typeof body === "object" &&
      !(body instanceof Blob) &&
      !(body instanceof FormData) &&
      !(body instanceof URLSearchParams) &&
      !(body instanceof ReadableStream) &&
      !(typeof body === "string")
    ) {
      if (!headers.has("Content-Type"))
        headers.set("Content-Type", "application/json");
      return JSON.stringify(body);
    }
    if (typeof body === "string" && !headers.has("Content-Type")) {
      try {
        JSON.parse(body);
        headers.set("Content-Type", "application/json");
      } catch {
        headers.set("Content-Type", "text/plain");
      }
    }
    return body as BodyInit;
  }

  private async createErrorFromResponse(
    response: Response
  ): Promise<WefyError> {
    try {
      const contentType = response.headers.get("content-type");
      const errorText = contentType?.includes("application/json")
        ? JSON.stringify(await response.json())
        : await response.text();
      return new WefyError(`HTTP Error: ${response.status} - ${errorText}`, {
        status: response.status,
        statusText: response.statusText,
        response,
      });
    } catch {
      return new WefyError(
        `HTTP Error: ${response.status} - ${response.statusText}`
      );
    }
  }

  private async unwrapResponseData<ResponseData>(
    response: Response,
    method: HttpMethod
  ): Promise<ResponseData> {
    if (method === "HEAD" || response.status === 204)
      return undefined as unknown as ResponseData;
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) return response.json();
    if (contentType?.includes("text/"))
      return response.text() as Promise<ResponseData>;
    return response.blob() as Promise<ResponseData>;
  }

  private methodCanContainBody(method: HttpMethod): boolean {
    return ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  }
}
