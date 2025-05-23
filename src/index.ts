export * from "./core";
export * from "./extension";

// import {WefyError} from "./error";
// import {HttpMethod, Params, SanitizeUrlOptions,} from "./types";
// import {sanitizeUrl} from "./utils";
//
// export interface WefyConfig {
//   baseUrl: string;
//   timeout?: number;
//   options?: Omit<RequestInit, 'method' | 'body' | 'signal'>;
// }
//
// export type ResponseType =
//   | 'json'
//   | 'text'
//   | 'blob'
//   | 'arrayBuffer'
//   | 'formData';
//
// export interface WefyRequestConfig<BodyData = unknown> {
//   params?: Params;
//   body?: BodyData;
//   timeout?: number;
//   responseType?: ResponseType;
//   options?: Omit<RequestInit, 'method' | 'body' | 'signal'>;
//   encode?: boolean;
//   preserveEncoding?: boolean;
// }
//
// export type HTTPRequestBody =
//   | BodyInit
//   | Record<string, unknown>
//   | null
//   | undefined;
//
// export type EmptyRequestBody = Record<never, never>;
//
//
// export class WefyRequestError extends Error {
//   public readonly status?: number;
//   public readonly statusText?: string;
//   public readonly headers?: Record<string, string>;
//   public readonly url?: string;
//   public readonly method?: string;
//
//   constructor(message: string, details?: WefyErrorDetails) {
//     super(message);
//     this.name = 'WefyRequestError';
//     this.status = details?.status;
//     this.statusText = details?.statusText;
//     this.headers = details?.headers;
//     this.url = details?.url;
//     this.method = details?.method;
//
//     if (Error.captureStackTrace) {
//       Error.captureStackTrace(this, WefyRequestError);
//     }
//   }
// }
//
// export interface FileUploadConfig extends Omit<WefyRequestConfig<FormData>, 'body'> {
//   fields?: Record<string, string | number | boolean>;
//   method?: 'POST' | 'PUT' | 'PATCH';
// }
//
// export interface FormRequestConfig extends Omit<WefyRequestConfig<URLSearchParams>, 'body'> {
//   data: Record<string, string | number | boolean>;
// }
//
// interface WefyErrorDetails {
//   status?: number;
//   statusText?: string;
//   headers?: Record<string, string>;
//   url?: string;
//   method?: string;
// }
//
// class WefyRequest<BodyData extends HTTPRequestBody = HTTPRequestBody> {
//   constructor(
//     private readonly wefy: Wefy,
//     private readonly method: HttpMethod,
//     private readonly endpoint: string,
//     private readonly config?: WefyRequestConfig<BodyData>
//   ) {
//   }
//
//   async json<ResponseData = unknown>(): Promise<ResponseData> {
//     return this.wefy.executeRequest<ResponseData>(this.method, this.endpoint, {...this.config, responseType:
// 'json'}); }  async text(): Promise<string> { return this.wefy.executeRequest<string>(this.method, this.endpoint,
// {...this.config, responseType: 'text'}); }  async blob(): Promise<Blob> { return
// this.wefy.executeRequest<Blob>(this.method, this.endpoint, {...this.config, responseType: 'blob'}); }  async
// arrayBuffer(): Promise<ArrayBuffer> { return this.wefy.executeRequest<ArrayBuffer>(this.method, this.endpoint, {
// ...this.config, responseType: 'arrayBuffer' }); }  async formData(): Promise<FormData> { return
// this.wefy.executeRequest<FormData>(this.method, this.endpoint, {...this.config, responseType: 'formData'}); }  async
// raw(): Promise<Response> { return this.wefy.makeRawRequest(this.method, this.endpoint, this.config); } }  class
// WefyResponseType { constructor(private readonly wefy: Wefy, private readonly responseType: ResponseType = "json") {
// }  get<RequestQuery extends Params = Params>( endpoint: string, config?: Omit<WefyRequestConfig<EmptyRequestBody>,
// "body"> & { params?: RequestQuery } ): WefyRequest<EmptyRequestBody> { return new WefyRequest(this.wefy, "GET",
// endpoint, {...config, responseType: this.responseType}); }  post<RequestBody extends HTTPRequestBody =
// HTTPRequestBody>( endpoint: string, config?: WefyRequestConfig<RequestBody> ): WefyRequest<RequestBody> { return new
// WefyRequest(this.wefy, "POST", endpoint, {...config, responseType: this.responseType}); }  put<RequestBody extends
// HTTPRequestBody = HTTPRequestBody>( endpoint: string, config?: WefyRequestConfig<RequestBody> ):
// WefyRequest<RequestBody> { return new WefyRequest(this.wefy, "PUT", endpoint, {...config, responseType:
// this.responseType}); }  patch<RequestBody extends HTTPRequestBody = HTTPRequestBody>( endpoint: string, config?:
// WefyRequestConfig<RequestBody> ): WefyRequest<RequestBody> { return new WefyRequest(this.wefy, "PATCH", endpoint,
// {...config, responseType: this.responseType}); }  delete( endpoint: string, config?:
// WefyRequestConfig<EmptyRequestBody> ): WefyRequest<EmptyRequestBody> { return new WefyRequest(this.wefy, "DELETE",
// endpoint, {...config, responseType: this.responseType}); }  head( endpoint: string, config?: WefyRequestConfig<EmptyRequestBody> ): WefyRequest<EmptyRequestBody> { return new WefyRequest(this.wefy, "HEAD", endpoint, {...config, responseType: this.responseType}); }  options( endpoint: string, config?: WefyRequestConfig<EmptyRequestBody> ): WefyRequest<EmptyRequestBody> { return new WefyRequest(this.wefy, "OPTIONS", endpoint, {...config, responseType: this.responseType}); } }  class WefyRaw { constructor(private readonly wefy: Wefy) { }  get(endpoint: string, config?: WefyRequestConfig<EmptyRequestBody>): Promise<Response> { return this.wefy.makeRawRequest("GET", endpoint, config); }  post(endpoint: string, config?: WefyRequestConfig<HTTPRequestBody>): Promise<Response> { return this.wefy.makeRawRequest("POST", endpoint, config); }  put(endpoint: string, config?: WefyRequestConfig<HTTPRequestBody>): Promise<Response> { return this.wefy.makeRawRequest("PUT", endpoint, config); }  patch(endpoint: string, config?: WefyRequestConfig<HTTPRequestBody>): Promise<Response> { return this.wefy.makeRawRequest("PATCH", endpoint, config); }  delete(endpoint: string, config?: WefyRequestConfig<EmptyRequestBody>): Promise<Response> { return this.wefy.makeRawRequest("DELETE", endpoint, config); }  head(endpoint: string, config?: WefyRequestConfig<EmptyRequestBody>): Promise<Response> { return this.wefy.makeRawRequest("HEAD", endpoint, config); }  options(endpoint: string, config?: WefyRequestConfig<EmptyRequestBody>): Promise<Response> { return this.wefy.makeRawRequest("OPTIONS", endpoint, config); } }  export class Wefy { public readonly raw: WefyRaw; public readonly json: WefyResponseType; public readonly text: WefyResponseType; public readonly blob: WefyResponseType; public readonly arrayBuffer: WefyResponseType; public readonly formData: WefyResponseType; private readonly config: WefyConfig;  private constructor(config: WefyConfig) { this.validateConfig(config); this.config = { ...config, timeout: config.timeout ?? 5000, }; this.raw = new WefyRaw(this); this.json = new WefyResponseType(this, 'json'); this.text = new WefyResponseType(this, 'text'); this.blob = new WefyResponseType(this, 'blob'); this.arrayBuffer = new WefyResponseType(this, 'arrayBuffer'); this.formData = new WefyResponseType(this, 'formData'); }  static create(config: WefyConfig | string): Wefy { const parsedConfig = typeof config === "string" ? {baseUrl: config} : config; return new Wefy(parsedConfig); }  // Chainable API - returns WefyRequest for further chaining public get<RequestQuery extends Params = Params>( endpoint: string, config?: Omit<WefyRequestConfig<EmptyRequestBody>, "body"> & { params?: RequestQuery } ): WefyRequest<EmptyRequestBody> { return new WefyRequest(this, "GET", endpoint, config); }  public post<RequestBody extends HTTPRequestBody = HTTPRequestBody>( endpoint: string, config?: WefyRequestConfig<RequestBody> ): WefyRequest<RequestBody> { return new WefyRequest(this, "POST", endpoint, config); }  public put<RequestBody extends HTTPRequestBody = HTTPRequestBody>( endpoint: string, config?: WefyRequestConfig<RequestBody> ): WefyRequest<RequestBody> { return new WefyRequest(this, "PUT", endpoint, config); }  public patch<RequestBody extends HTTPRequestBody = HTTPRequestBody>( endpoint: string, config?: WefyRequestConfig<RequestBody> ): WefyRequest<RequestBody> { return new WefyRequest(this, "PATCH", endpoint, config); }  public delete( endpoint: string, config?: WefyRequestConfig<EmptyRequestBody> ): WefyRequest<EmptyRequestBody> { return new WefyRequest(this, "DELETE", endpoint, config); }  public head( endpoint: string, config?: WefyRequestConfig<EmptyRequestBody> ): WefyRequest<EmptyRequestBody> { return new WefyRequest(this, "HEAD", endpoint, config); }  public options( endpoint: string, config?: WefyRequestConfig<EmptyRequestBody> ): WefyRequest<EmptyRequestBody> { return new WefyRequest(this, "OPTIONS", endpoint, config); }  // Convenience methods for file uploads and forms public upload( endpoint: string, files: File | File[] | Record<string, File>, config?: Omit<WefyRequestConfig<FormData>, 'body'> & { fields?: Record<string, string | number | boolean>; method?: 'POST' | 'PUT' | 'PATCH'; } ): WefyRequest<FormData> { const formData = new FormData();  // Add files if (files instanceof File) { formData.append('file', files); } else if (Array.isArray(files)) { files.forEach((file, index) => { formData.append(`file_${index}`, file); }); } else { Object.entries(files).forEach(([key, file]) => { formData.append(key, file); }); }  // Add additional fields if (config?.fields) { Object.entries(config.fields).forEach(([key, value]) => { formData.append(key, String(value)); }); }  const method = config?.method ?? 'POST'; const {fields, method: _, ...restConfig} = config ?? {};  return new WefyRequest(this, method, endpoint, { ...restConfig, body: formData, }); }  public form( method: HttpMethod, endpoint: string, data: Record<string, string | number | boolean>, config?: Omit<WefyRequestConfig<URLSearchParams>, 'body'> ): WefyRequest<URLSearchParams> { const formData = new URLSearchParams(); Object.entries(data).forEach(([key, value]) => { formData.append(key, String(value)); });  return new WefyRequest(this, method, endpoint, { ...config, body: formData, }); }  public async executeRequest<ResponseData extends ResponseType | unknown | undefined = ResponseType>( method: HttpMethod, endpoint: string, config?: WefyRequestConfig<HTTPRequestBody> & { responseType?: string } ): Promise<ResponseData> { const response = await this.makeRawRequest(method, endpoint, config);  if (!response.ok) { const headers: Record<string, string> = {}; response.headers.forEach((value, key) => { headers[key] = value; });  let errorMessage = `Request failed with status ${response.status}`; try { const errorText = await response.clone().text(); if (errorText) { errorMessage += `: ${errorText}`; } } catch { // Ignore errors when reading a response text }  throw new WefyRequestError(errorMessage, { status: response.status, statusText: response.statusText, headers, url: response.url, method, }); }  // Handle empty responses const contentLength = response.headers.get('content-length'); if (contentLength === '0' || response.status === 204 || method === "HEAD") { return undefined as unknown as ResponseData; }  // Handle different response types const responseType = config?.responseType ?? 'json';  try { switch (responseType) { case 'json': return await response.json(); case 'text': return await response.text(); case 'blob': return await response.blob() as unknown as ResponseData; case 'arrayBuffer': return await response.arrayBuffer() as unknown as ResponseData; case 'formData': return await response.formData() as unknown as ResponseData; default: return await response.json(); } } catch (error) { throw new WefyRequestError(`Failed to parse ${responseType} response: ${String(error)}`); } }  public async makeRawRequest( method: HttpMethod, endpoint: string, config?: WefyRequestConfig<HTTPRequestBody> ): Promise<Response> { const timeoutMs = config?.timeout ?? this.config.timeout ?? 5000; const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), timeoutMs);  try { const sanitizeOptions: SanitizeUrlOptions = { encode: config?.encode ?? true, preserveEncoding: config?.preserveEncoding ?? false, };  const url = sanitizeUrl(this.config.baseUrl, endpoint, config?.params, sanitizeOptions);  const headers = new Headers();  // Add base headers if (this.config.options?.headers) { for (const [key, value] of Object.entries(this.config.options.headers)) { if (typeof value === 'string') { headers.set(key, value); } } }  // Add request-specific headers (these can override base headers) if (config?.options?.headers) { for (const [key, value] of Object.entries(config.options.headers)) { if (typeof value === 'string') { headers.set(key, value); } } }  let body: BodyInit | undefined;  if (config?.body !== undefined && config?.body !== null) { if (config.body instanceof FormData || config.body instanceof Blob || config.body instanceof ArrayBuffer || config.body instanceof URLSearchParams || config.body instanceof ReadableStream || typeof config.body === 'string') { body = config.body; } else if (typeof config.body === 'object') { body = JSON.stringify(config.body); if (!headers.has('Content-Type')) { headers.set('Content-Type', 'application/json'); } } }  // Build fetch options carefully to avoid overriding critical properties const baseOptions = {...this.config.options}; const requestOptions = {...config?.options};  // Remove headers from options since we handle them separately delete baseOptions.headers; delete requestOptions.headers;  const fetchOptions: RequestInit = { ...baseOptions, ...requestOptions, method, headers, body, signal: controller.signal, };  return await fetch(url.toString(), fetchOptions); } catch (error) { if (error instanceof Error && error.name === 'AbortError') { throw new WefyRequestError(`Request timed out after ${timeoutMs}ms`); } throw error instanceof WefyError ? error : new WefyRequestError(`Request failed: ${String(error)}`); } finally { clearTimeout(timeoutId); } }  private validateConfig(config: WefyConfig): void { if (!config.baseUrl) { throw new WefyError("Base URL is required"); }  try { const url = new URL(config.baseUrl); if (!["http:", "https:"].includes(url.protocol)) { throw new WefyError("Only http and https protocols are supported"); } } catch (error) { throw new WefyError("Invalid base URL"); } } }
