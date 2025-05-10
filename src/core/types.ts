import { WefyExtension } from "@/types";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type Params = Record<
  string,
  string | number | boolean | undefined | (string | number | boolean)[]
>;

export interface SanitizeUrlOptions {
  encode?: boolean;
  preserveEncoding?: boolean;
}

export interface WefyExtensionConfig {
  use: ReadonlyArray<WefyExtension>;
  config?: Record<string, unknown>;
}

/**
 * Configuration interface for Wefy HTTP client
 */
export interface WefyConfig extends Partial<SanitizeUrlOptions> {
  baseUrl: string;
  options?: Omit<RequestInit, "method" | "body">;
  timeout?: number;
  extensions?: WefyExtensionConfig;
}

/**
 * Request configuration interface
 * @template Body - Type of the request body
 */
export interface WefyRequestConfig<
  Body extends BodyInit | object | null | undefined = undefined
> extends Omit<WefyConfig, "baseUrl" | "options"> {
  params?: Params;
  options?: RequestInit;
  body?: Body;
}
export type EmptyRequestBody = Record<string, never>;
export class WefyResponse<ResponseData> extends Promise<ResponseData> {
  constructor(
    executor: (
      resolve: (value: ResponseData | PromiseLike<ResponseData>) => void,
      reject: (reason?: unknown) => void
    ) => void,
    private readonly rawResponse: Promise<Response>
  ) {
    super(executor);
  }

  raw(): Promise<Response> {
    return this.rawResponse.then((res) => res.clone());
  }

  static from<ResponseData>(
    dataPromise: Promise<ResponseData>,
    rawResponse: Promise<Response>
  ): WefyResponse<ResponseData> {
    return new WefyResponse<ResponseData>(
      (resolve, reject) => dataPromise.then(resolve).catch(reject),
      rawResponse
    );
  }
}
export type HTTPRequestBody =
  | BodyInit
  | Record<string, unknown>
  | null
  | undefined;

export interface HTTPClientInterface {
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
