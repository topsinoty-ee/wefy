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

/**
 * Configuration interface for Wefy HTTP client
 */
export interface WefyConfig extends SanitizeUrlOptions {
  baseUrl: string;
  options?: Omit<RequestInit, "method" | "body">;
  timeout?: number;
}

/**
 * Request configuration interface
 * @template Body - Type of the request body
 */
export interface WefyRequestConfig<
  Body extends BodyInit | object | null | undefined = undefined
> extends Partial<SanitizeUrlOptions> {
  params?: Params;
  options?: RequestInit;
  body?: Body;
  timeout?: number;
}
