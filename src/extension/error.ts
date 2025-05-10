export class ExtensionError extends Error {
  constructor(message: string, public readonly extensionName?: string) {
    super(message);
    this.name = "ExtensionError";
  }
}
