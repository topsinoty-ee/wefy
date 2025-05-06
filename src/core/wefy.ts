import { WefyError } from "./error";
import { Params, HttpMethod } from "./types";
import { sanitizeUrl } from "./utils";

export interface WefyConfig {
  baseUrl: string;
  options?: Omit<RequestInit, "method" | "body">;
}

interface WefyRequestConfig<
  Body extends BodyInit | object | null | undefined = undefined
> {
  params?: Params;
  options?: RequestInit;
  body?: Body;
}

export interface HttpClient {
  get<Response = unknown>(
    endpoint: string,
    config?: Omit<WefyRequestConfig, "body">
  ): Promise<Response>;
  post<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(
    endpoint: string,
    config?: WefyRequestConfig<Body>
  ): Promise<Response>;
  put<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(
    endpoint: string,
    config?: WefyRequestConfig<Body>
  ): Promise<Response>;
  patch<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(
    endpoint: string,
    config?: WefyRequestConfig<Body>
  ): Promise<Response>;
  delete<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(
    endpoint: string,
    config?: WefyRequestConfig<Body>
  ): Promise<Response>;
  head<Response = unknown>(
    endpoint: string,
    config?: Omit<WefyRequestConfig, "body">
  ): Promise<Response>;
  options<Response = unknown>(
    endpoint: string,
    config?: Omit<WefyRequestConfig, "body">
  ): Promise<Response>;
}

export class Wefy implements HttpClient {
  private constructor(private readonly config: WefyConfig) {
    this.validateConfig(config);
  }

  static create(config: WefyConfig): Wefy;
  static create(baseUrl: string): Wefy;
  static create(config: WefyConfig | string): Wefy {
    return new Wefy(typeof config === "string" ? { baseUrl: config } : config);
  }

  private validateConfig(config: WefyConfig): void {
    if (!config.baseUrl) throw new WefyError("Base URL is required");
    try {
      new URL(config.baseUrl);
    } catch {
      throw new WefyError("Invalid base URL format");
    }
  }

  get<Response = unknown>(
    endpoint: string,
    config?: Omit<WefyRequestConfig, "body">
  ) {
    return this.request<Response, undefined>("GET", endpoint, config);
  }

  post<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(endpoint: string, config?: WefyRequestConfig<Body>) {
    return this.request<Response, Body>("POST", endpoint, config);
  }

  put<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(endpoint: string, config?: WefyRequestConfig<Body>) {
    return this.request<Response, Body>("PUT", endpoint, config);
  }

  patch<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(endpoint: string, config?: WefyRequestConfig<Body>) {
    return this.request<Response, Body>("PATCH", endpoint, config);
  }

  delete<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(endpoint: string, config?: WefyRequestConfig<Body>) {
    return this.request<Response, Body>("DELETE", endpoint, config);
  }

  head<Response = unknown>(
    endpoint: string,
    config?: Omit<WefyRequestConfig, "body">
  ) {
    return this.request<Response, undefined>("HEAD", endpoint, config);
  }

  options<Response = unknown>(
    endpoint: string,
    config?: Omit<WefyRequestConfig, "body">
  ) {
    return this.request<Response, undefined>("OPTIONS", endpoint, config);
  }

  private async request<
    Response,
    Body extends BodyInit | object | null | undefined = undefined
  >(
    method: HttpMethod,
    endpoint: string,
    config?: WefyRequestConfig<Body>
  ): Promise<Response> {
    const url = sanitizeUrl(this.config.baseUrl, endpoint, config?.params);
    const headers = new Headers({
      ...this.config.options?.headers,
      ...config?.options?.headers,
    });

    let processedBody: BodyInit | undefined = undefined;

    if (this.canHaveBody(method) && config?.body !== undefined) {
      if (
        typeof config.body === "object" &&
        !(config.body instanceof Blob) &&
        !(config.body instanceof FormData) &&
        !(config.body instanceof URLSearchParams) &&
        !(config.body instanceof ReadableStream) &&
        !(typeof config.body === "string") &&
        config.body !== null
      ) {
        processedBody = JSON.stringify(config.body);

        if (!headers.has("Content-Type")) {
          headers.set("Content-Type", "application/json");
        }
      } else {
        processedBody = config.body as BodyInit;

        if (!headers.has("Content-Type")) {
          if (typeof processedBody === "string") {
            try {
              JSON.parse(processedBody);
              headers.set("Content-Type", "application/json");
            } catch {
              headers.set("Content-Type", "text/plain");
            }
          }
        }
      }
    }

    try {
      const response = await fetch(url.toString(), {
        ...this.config.options,
        ...config?.options,
        method,
        headers,
        body: processedBody,
      });

      if (!response.ok) {
        const errorText = await this.parseError(response);
        throw new WefyError(`Request failed: ${response.status} ${errorText}`);
      }

      return this.parseResponse<Response>(response);
    } catch (error) {
      if (error instanceof WefyError) throw error;
      throw new WefyError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  }

  private async parseResponse<T>(response: globalThis.Response): Promise<T> {
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      return response.json() as Promise<T>;
    } else if (contentType?.includes("text/")) {
      const text = await response.text();
      return text as unknown as T;
    } else {
      return response as unknown as T;
    }
  }

  private async parseError(response: globalThis.Response): Promise<string> {
    try {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const errorJson = await response.json();
        return JSON.stringify(errorJson);
      }
      return await response.text();
    } catch {
      return response.statusText;
    }
  }

  private canHaveBody(method: HttpMethod): boolean {
    return ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  }
}
