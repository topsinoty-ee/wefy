import { WefyError } from "./error";
import { Params, sanitizeUrl } from "./utils";

interface HTTPSMethods {
  get<DataType = unknown>(
    endpoint: string,
    config?: WefyRequestConfig
  ): Promise<DataType>;
}

export interface WefyConfig {
  baseUrl: string | `https://${string}`;
  options?: RequestInit;
}

export interface WefyRequestConfig {
  params?: Params;
  options?: Omit<RequestInit, "method">;
}

export class Wefy implements HTTPSMethods {
  private defaultConfig: WefyConfig;

  private constructor(config: WefyConfig) {
    if (!config || !config.baseUrl) {
      throw new WefyError("Weaver created without config");
    }

    this.defaultConfig = config;
  }

  public static create(config: WefyConfig) {
    return new Wefy(config);
  }

  public async request<DataType = unknown>(
    method: keyof HTTPSMethods,
    endpoint: string,
    config?: WefyRequestConfig
  ): Promise<DataType> {
    const { params, options } = config ?? {};
    const url = sanitizeUrl(this.defaultConfig.baseUrl, endpoint, params);

    const {
      headers: headersInit,
      body,
      ...otherOptions
    } = options ? options : {};
    const headers = new Headers({
      ...this.defaultConfig.options?.headers,
      ...headersInit,
    });

    const response = await fetch(url.toString(), {
      method: method.toUpperCase(),
      headers,
      body,
      ...otherOptions,
    });
    return response.json();
  }

  public async get<DataType = unknown>(
    endpoint: string,
    config?: WefyRequestConfig
  ): Promise<DataType> {
    return this.request<DataType>("get", endpoint, config);
  }
}
