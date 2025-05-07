interface WefyErrorOptions {
  error: unknown;
  cause: unknown;
  status: number;
  response: Response;
}

export class WefyError extends Error {
  constructor(message: string, options?: Partial<WefyErrorOptions>) {
    super(message);
    this.name = "WefyError";

    if (options?.cause) {
      (this as any).cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
