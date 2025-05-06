export class WefyError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "WefyError";

    if (options?.cause) {
      (this as any).cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
