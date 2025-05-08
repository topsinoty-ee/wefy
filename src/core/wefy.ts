import { WefyError } from "./error";
import {
  HttpMethod,
  WefyConfig,
  WefyRequestConfig,
  Params,
  SanitizeUrlOptions,
} from "./types";
import { createSignal, resolveFetch, sanitizeUrl } from "./utils";

type HTTPClientResponse<ResponseData> = ResponseData;
type HTTPRequestBody = BodyInit | Record<string, unknown> | null | undefined;
type EmptyRequestBody = Record<string, never>;

interface HTTPClientInterface {
  get<ResponseData = unknown, RequestQuery extends Params = Params>(
    endpoint: string,
    config?: Omit<WefyRequestConfig<EmptyRequestBody>, "body"> & {
      params?: RequestQuery;
    }
  ): Promise<HTTPClientResponse<ResponseData>>;

  post<
    ResponseData = unknown,
    RequestBody extends HTTPRequestBody = undefined,
    RequestQuery extends Params = Params
  >(
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): Promise<HTTPClientResponse<ResponseData>>;

  put<
    ResponseData = unknown,
    RequestBody extends HTTPRequestBody = undefined,
    RequestQuery extends Params = Params
  >(
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): Promise<HTTPClientResponse<ResponseData>>;

  patch<
    ResponseData = unknown,
    RequestBody extends HTTPRequestBody = undefined,
    RequestQuery extends Params = Params
  >(
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): Promise<HTTPClientResponse<ResponseData>>;

  delete<
    ResponseData = unknown,
    RequestBody extends HTTPRequestBody = undefined,
    RequestQuery extends Params = Params
  >(
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): Promise<HTTPClientResponse<ResponseData>>;

  head<ResponseData = unknown, RequestQuery extends Params = Params>(
    endpoint: string,
    config?: Omit<WefyRequestConfig<EmptyRequestBody>, "body"> & {
      params?: RequestQuery;
    }
  ): Promise<HTTPClientResponse<ResponseData>>;

  options<ResponseData = unknown, RequestQuery extends Params = Params>(
    endpoint: string,
    config?: Omit<WefyRequestConfig<EmptyRequestBody>, "body"> & {
      params?: RequestQuery;
    }
  ): Promise<HTTPClientResponse<ResponseData>>;
}

export class Wefy implements HTTPClientInterface {
  private constructor(private readonly config: WefyConfig) {
    this.validateConfig(config);
    this.config.timeout = config.timeout ?? 5000;
    this.config.encode = config.encode ?? true;
    this.config.preserveEncoding = config.preserveEncoding ?? false;
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
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new WefyError("Only http and https protocols are supported");
      }
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
  ): Promise<HTTPClientResponse<ResponseData>> {
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
  ): Promise<HTTPClientResponse<ResponseData>> {
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
  ): Promise<HTTPClientResponse<ResponseData>> {
    return this.makeRequest<ResponseData, RequestBody, RequestQuery>(
      "PUT",
      endpoint,
      config
    );
  }

  public patch<
    ResponseData = unknown,
    RequestBody extends HTTPRequestBody = undefined,
    RequestQuery extends Params = Params
  >(
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): Promise<HTTPClientResponse<ResponseData>> {
    return this.makeRequest<ResponseData, RequestBody, RequestQuery>(
      "PATCH",
      endpoint,
      config
    );
  }

  public delete<
    ResponseData = unknown,
    RequestBody extends HTTPRequestBody = undefined,
    RequestQuery extends Params = Params
  >(
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): Promise<HTTPClientResponse<ResponseData>> {
    return this.makeRequest<ResponseData, RequestBody, RequestQuery>(
      "DELETE",
      endpoint,
      config
    );
  }

  public head<ResponseData = unknown, RequestQuery extends Params = Params>(
    endpoint: string,
    config?: Omit<WefyRequestConfig<EmptyRequestBody>, "body"> & {
      params?: RequestQuery;
    }
  ): Promise<HTTPClientResponse<ResponseData>> {
    return this.makeRequest<ResponseData, EmptyRequestBody, RequestQuery>(
      "HEAD",
      endpoint,
      config
    );
  }

  public options<ResponseData = unknown, RequestQuery extends Params = Params>(
    endpoint: string,
    config?: Omit<WefyRequestConfig<EmptyRequestBody>, "body"> & {
      params?: RequestQuery;
    }
  ): Promise<HTTPClientResponse<ResponseData>> {
    return this.makeRequest<ResponseData, EmptyRequestBody, RequestQuery>(
      "OPTIONS",
      endpoint,
      config
    );
  }

  private async makeRequest<
    ResponseData,
    RequestBody extends HTTPRequestBody,
    RequestQuery extends Params
  >(
    method: HttpMethod,
    endpoint: string,
    config?: WefyRequestConfig<RequestBody> & { params?: RequestQuery }
  ): Promise<HTTPClientResponse<ResponseData>> {
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

    try {
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

      if (!response.ok) {
        throw await this.createErrorFromResponse(response);
      }

      return this.unwrapResponseData<ResponseData>(response, method);
    } catch (error) {
      throw error instanceof WefyError
        ? error
        : new WefyError(
            error instanceof Error ? error.message : "Unknown request error"
          );
    } finally {
      clearTimeout(timeoutId);
      cleanup();
    }
  }

  private processRequestBody<RequestBody extends HTTPRequestBody>(
    headers: Headers,
    body?: RequestBody
  ): BodyInit | undefined {
    if (body === null || body === undefined) {
      return undefined;
    }

    if (
      typeof body === "object" &&
      !(body instanceof Blob) &&
      !(body instanceof FormData) &&
      !(body instanceof URLSearchParams) &&
      !(body instanceof ReadableStream) &&
      !(typeof body === "string")
    ) {
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
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
    const errorText = await this.parseErrorResponse(response);
    return new WefyError(`HTTP Error: ${response.status} - ${errorText}`, {
      status: response.status,
      statusText: response.statusText,
      response,
    });
  }

  private async unwrapResponseData<ResponseData>(
    response: Response,
    method: HttpMethod
  ): Promise<HTTPClientResponse<ResponseData>> {
    if (method === "HEAD" || response.status === 204) {
      return undefined as unknown as ResponseData;
    }

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      return response.json();
    }

    if (contentType?.includes("text/")) {
      return response.text() as Promise<ResponseData>;
    }

    return response.blob() as Promise<ResponseData>;
  }

  private async parseErrorResponse(response: Response): Promise<string> {
    try {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const errorData = await response.json();
        return errorData.message || JSON.stringify(errorData);
      }
      return await response.text();
    } catch {
      return response.statusText;
    }
  }

  private methodCanContainBody(method: HttpMethod): boolean {
    return ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  }
}
