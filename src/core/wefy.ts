import { WefyError } from "./error";
import { Params, HttpMethod } from "./types";
import { sanitizeUrl } from "./utils";

/**
 * Configuration interface for Wefy HTTP client
 */
export interface WefyConfig {
  baseUrl: string;
  options?: Omit<RequestInit, "method" | "body">;
}

/**
 * Request configuration interface
 * @template Body - Type of the request body
 */
export interface WefyRequestConfig<
  Body extends BodyInit | object | null | undefined = undefined
> {
  params?: Params;
  options?: RequestInit;
  body?: Body;
}

/**
 * Interface defining HTTP client methods
 */
export interface HttpClientVerbs {
  /** @inheritdoc */
  get<Response = unknown>(
    endpoint: string,
    config?: Omit<WefyRequestConfig, "body">
  ): Promise<Response>;

  /** @inheritdoc */
  post<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(
    endpoint: string,
    config?: WefyRequestConfig<Body>
  ): Promise<Response>;

  /** @inheritdoc */
  put<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(
    endpoint: string,
    config?: WefyRequestConfig<Body>
  ): Promise<Response>;

  /** @inheritdoc */
  patch<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(
    endpoint: string,
    config?: WefyRequestConfig<Body>
  ): Promise<Response>;

  /** @inheritdoc */
  delete<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(
    endpoint: string,
    config?: WefyRequestConfig<Body>
  ): Promise<Response>;

  /** @inheritdoc */
  head<Response = unknown>(
    endpoint: string,
    config?: Omit<WefyRequestConfig, "body">
  ): Promise<Response>;

  /** @inheritdoc */
  options<Response = unknown>(
    endpoint: string,
    config?: Omit<WefyRequestConfig, "body">
  ): Promise<Response>;
}
/**
 * @todo timeout
 * @todo abortsignal
 * @todo registry
 * @todo immutability
 * @todo extensions
 * @todo proper docs
 *
 *
 * @class Wefy
 * @description A configurable HTTP client with a fluent interface for making web requests
 */
export class Wefy implements HttpClientVerbs {
  private constructor(private readonly config: WefyConfig) {
    this.validateConfig(config);
  }

  /**
   * Creates a new Wefy instance with the given configuration
   * @param config - Configuration object or base URL string
   * @returns A new Wefy instance
   * @throws { WefyError } If the base URL is invalid or missing
   * @example
   * const client = Wefy.create('https://api.example.com');
   * const client = Wefy.create({ baseUrl: 'https://api.example.com' });
   */
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

  /**
   * Sends a GET request to the specified endpoint
   * @param endpoint - URL endpoint path
   * @param config - Optional request configuration
   * @returns Promise resolving to response data
   */
  get<Response = unknown>(
    endpoint: string,
    config?: Omit<WefyRequestConfig, "body">
  ) {
    return this.request<Response, undefined>("GET", endpoint, config);
  }

  /**
   * Sends a POST request to the specified endpoint
   * @param endpoint - URL endpoint path
   * @param config - Optional request configuration including body
   * @returns Promise resolving to response data
   */
  post<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(endpoint: string, config?: WefyRequestConfig<Body>) {
    return this.request<Response, Body>("POST", endpoint, config);
  }

  /**
   * Sends a PUT request to the specified endpoint
   * @param endpoint - URL endpoint path
   * @param config - Optional request configuration including body
   * @returns Promise resolving to response data
   */
  put<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(endpoint: string, config?: WefyRequestConfig<Body>) {
    return this.request<Response, Body>("PUT", endpoint, config);
  }

  /**
   * Sends a PATCH request to the specified endpoint
   * @param endpoint - URL endpoint path
   * @param config - Optional request configuration including body
   * @returns Promise resolving to response data
   */
  patch<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(endpoint: string, config?: WefyRequestConfig<Body>) {
    return this.request<Response, Body>("PATCH", endpoint, config);
  }

  /**
   * Sends a DELETE request to the specified endpoint
   * @param endpoint - URL endpoint path
   * @param config - Optional request configuration including body
   * @returns Promise resolving to response data
   */
  delete<
    Response = unknown,
    Body extends BodyInit | object | null | undefined = undefined
  >(endpoint: string, config?: WefyRequestConfig<Body>) {
    return this.request<Response, Body>("DELETE", endpoint, config);
  }

  /**
   * Sends a HEAD request to the specified endpoint
   * @param endpoint - URL endpoint path
   * @param config - Optional request configuration
   * @returns Promise resolving to response data
   */
  head<Response = unknown>(
    endpoint: string,
    config?: Omit<WefyRequestConfig, "body">
  ) {
    return this.request<Response, undefined>("HEAD", endpoint, config);
  }

  /**
   * Sends an OPTIONS request to the specified endpoint
   * @param endpoint - URL endpoint path
   * @param config - Optional request configuration
   * @returns Promise resolving to response data
   */
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
