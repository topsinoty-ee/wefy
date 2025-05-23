interface WefyErrorOptions {
  error: unknown;
  cause: unknown;
  status: number;
  statusText: string;
  response: Response;
}

export class WefyError extends Error {
  public response?: Response;
  public error?: unknown;
  public status?: number;
  public statusText?: string;
  public cause?: unknown;
  
  constructor(
    message: string,
    public readonly options?: Partial<WefyErrorOptions>
  ) {
    super(message);
    this.name = "WefyError";
    this.cause = options?.cause;
    this.status = options?.status;
    this.statusText = options?.statusText;
    this.response = options?.response;
    this.error = options?.error;
    
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class WefyTimeoutError extends WefyError {
  constructor(timeout: number | undefined) {
    super(`Request timeout after ${timeout}ms`);
    this.name = 'WefyTimeoutError';
  }
}

class WefyParseError extends WefyError {
  constructor(contentType: string, originalError: unknown) {
    super(`Failed to parse response with content-type: ${contentType}`);
    this.name = 'WefyParseError';
    this.cause = originalError;
  }
}

export {WefyParseError};
export {WefyTimeoutError};