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
