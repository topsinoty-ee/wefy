import {WefyParseError} from "@/core/error.ts";

class WefyResponse<Data = unknown> extends Promise<Data> {
  private response: Response | null = null;
  private responseData = new Map<string, unknown>();
  private readonly responseReady: Promise<Response>;
  
  constructor(resPromise: Promise<Response> | Response) {
    let resolveResponse: (response: Response) => void;
    let rejectResponse: (error: unknown) => void;
    
    const responsePromise = new Promise<Response>((resolve, reject) => {
      resolveResponse = resolve;
      rejectResponse = reject;
    });
    
    super(async (resolve, reject) => {
      try {
        const response = resPromise instanceof Promise ? await resPromise : resPromise;
        const clonedResponse = response.clone();
        resolveResponse(clonedResponse);
        
        const parsedData = await this.parseResponseData(clonedResponse);
        resolve(parsedData);
      } catch (err) {
        rejectResponse(err);
        reject(err);
      }
    });
    
    this.responseReady = responsePromise;
    this.responseReady.then(response => {
      this.response = response;
    }).catch(() => {
    });
  }
  
  get ok(): boolean {
    return this.response?.ok ?? false;
  }
  
  get status(): number {
    return this.response?.status ?? 0;
  }
  
  get headers(): Headers {
    return this.response?.headers ?? new Headers();
  }
  
  raw(): Response {
    if (!this.response) {
      throw new Error('Response not ready');
    }
    return this.response;
  }
  
  async json<T = Data>(): Promise<T> {
    await this.responseReady;
    if (!this.response) {
      throw new Error('Response not ready');
    }
    
    const cacheKey = 'json';
    if (!this.responseData.has(cacheKey)) {
      try {
        const data = await this.response.clone().json();
        this.responseData.set(cacheKey, data);
      } catch (error) {
        throw new WefyParseError('application/json', error);
      }
    }
    
    return this.responseData.get(cacheKey) as T;
  }
  
  async text(): Promise<string> {
    await this.responseReady;
    if (!this.response) {
      throw new Error('Response not ready');
    }
    
    const cacheKey = 'text';
    if (!this.responseData.has(cacheKey)) {
      const data = await this.response.clone().text();
      this.responseData.set(cacheKey, data);
    }
    
    return this.responseData.get(cacheKey) as string;
  }
  
  async blob(): Promise<Blob> {
    await this.responseReady;
    if (!this.response) {
      throw new Error('Response not ready');
    }
    
    const cacheKey = 'blob';
    if (!this.responseData.has(cacheKey)) {
      const data = await this.response.clone().blob();
      this.responseData.set(cacheKey, data);
    }
    
    return this.responseData.get(cacheKey) as Blob;
  }
  
  async formData(): Promise<FormData> {
    await this.responseReady;
    if (!this.response) {
      throw new Error('Response not ready');
    }
    
    const cacheKey = 'formData';
    if (!this.responseData.has(cacheKey)) {
      const data = await this.response.clone().formData();
      this.responseData.set(cacheKey, data);
    }
    
    return this.responseData.get(cacheKey) as FormData;
  }
  
  async arrayBuffer(): Promise<ArrayBuffer> {
    await this.responseReady;
    if (!this.response) {
      throw new Error('Response not ready');
    }
    
    const cacheKey = 'arrayBuffer';
    if (!this.responseData.has(cacheKey)) {
      const data = await this.response.clone().arrayBuffer();
      this.responseData.set(cacheKey, data);
    }
    
    return this.responseData.get(cacheKey) as ArrayBuffer;
  }
  
  async auto(): Promise<Data> {
    await this.responseReady;
    if (!this.response) {
      throw new Error('Response not ready');
    }
    
    const contentType = this.response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      return this.json<Data>();
    }
    
    if (contentType.includes('text/')) {
      return this.text() as Promise<Data>;
    }
    
    if (contentType.includes('multipart/form-data')) {
      return this.formData() as Promise<Data>;
    }
    
    return this.blob() as Promise<Data>;
  }
  
  private async parseResponseData(response: Response): Promise<Data> {
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      return this.tryParseJson(response);
    }
    
    if (contentType.includes('text/')) {
      return response.text() as Promise<Data>;
    }
    
    if (contentType.includes('multipart/form-data')) {
      return response.formData() as Promise<Data>;
    }
    
    return response.blob() as Promise<Data>;
  }
  
  private async tryParseJson(response: Response): Promise<Data> {
    try {
      return await response.json();
    } catch (jsonError) {
      try {
        return await response.clone().text() as Data;
      } catch (textError) {
        throw new WefyParseError('application/json', jsonError);
      }
    }
  }
}

export {WefyResponse};