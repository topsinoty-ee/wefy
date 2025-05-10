import { ExtensionError, WefyExtension } from "./types";

export function createExtension<ExtensionState extends Record<string, unknown>>(
  extension: WefyExtension<ExtensionState>
): Readonly<WefyExtension<ExtensionState>> {
  return Object.freeze(extension);
}

/**
 * Creates a merged array of extensions, handling duplicates by preferring the newer version
 */
export function mergeExtensions(
  baseExtensions: ReadonlyArray<WefyExtension>,
  additionalExtensions: ReadonlyArray<WefyExtension>
): WefyExtension[] {
  const extensionMap = new Map<string, WefyExtension>();

  // First add all base extensions
  for (const ext of baseExtensions) {
    extensionMap.set(ext.name, ext);
  }

  // Then add or override with additional extensions
  for (const ext of additionalExtensions) {
    extensionMap.set(ext.name, ext);
  }

  return Array.from(extensionMap.values());
}

/**
 * Creates an error specific to extensions
 */
export function createExtensionError(
  message: string,
  extensionName?: string,
  code?: string
): ExtensionError {
  const error = new Error(message) as ExtensionError;
  error.name = "ExtensionError";
  if (extensionName) error.extensionName = extensionName;
  if (code) error.code = code;
  return error;
}
