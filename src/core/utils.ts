import {Params, SanitizeUrlOptions} from "./types";

/**
 * Combines multiple AbortSignals into a single signal
 */
export function createSignal(...signals: (AbortSignal | null | undefined)[]): {
  signal: AbortSignal; cleanup: () => void;
} {
  const controller = new AbortController();
  const abort = () => controller.abort();
  
  const cleanups: (() => void)[] = [];
  
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      controller.abort();
      return {
        signal: controller.signal, cleanup: () => {
        }
      };
    }
    signal.addEventListener("abort", abort, {once: true});
    cleanups.push(() => signal.removeEventListener("abort", abort));
  }
  
  return {
    signal: controller.signal, cleanup: () => cleanups.forEach((fn) => fn()),
  };
}

/**
 * Ensures fetch is available in the global context
 */
export function resolveFetch(): typeof fetch {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch;
  }
  throw new Error(`[Wefy] No global fetch available. Node version ${process.versions.node}. Please use Node.js 18+ or provide a custom fetch implementation.`);
}

/**
 * Sanitizes a URL by combining base URL, endpoint, and query parameters
 */
export function sanitizeUrl(baseUrl: string, endpoint: string = "", params?: Params, options: SanitizeUrlOptions = {
  encode: false, preserveEncoding: true,
}): URL {
  if (!baseUrl.trim()) {
    throw new TypeError("Base URL must be a non-empty string");
  }
  
  try {
    const base = new URL(baseUrl);
    
    const [rawPath, ...queryParts] = endpoint.split("?");
    const endpointQuery = queryParts.join("?");
    
    let fullPath = base.pathname;
    if (rawPath) {
      if (fullPath.endsWith("/") && rawPath.startsWith("/")) {
        fullPath += rawPath.slice(1);
      } else if (!fullPath.endsWith("/") && !rawPath.startsWith("/")) {
        fullPath += "/" + rawPath;
      } else {
        fullPath += rawPath;
      }
    }
    
    const resolvedUrl = new URL(fullPath, base);
    
    if (endpointQuery) {
      try {
        const searchParams = new URLSearchParams(endpointQuery);
        searchParams.forEach((value, key) => {
          if (key && value) {
            resolvedUrl.searchParams.append(options.preserveEncoding ? key : encodeURIComponent(key), options.preserveEncoding ? value : encodeURIComponent(value));
          }
        });
      } catch (e) {
        console.warn("Failed to parse endpoint query string", e);
      }
    }
    
    if (params && typeof params === "object") {
      Object.entries(params).forEach(([key, value]) => {
        if (!key) return;
        const processedKey = options.encode ? encodeURIComponent(key) : key;
        
        resolvedUrl.searchParams.delete(processedKey);
        
        if (value === undefined || value === null) return;
        
        const processValue = (val: string | number | boolean) => options.encode ? encodeURIComponent(String(val)) : String(val);
        
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item !== undefined && item !== null) {
              resolvedUrl.searchParams.append(processedKey, processValue(item));
            }
          });
        } else {
          resolvedUrl.searchParams.set(processedKey, processValue(value));
        }
      });
    }
    
    return resolvedUrl;
  } catch (error) {
    throw new Error(`Failed to construct URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const clonedRes = (response: Response) => response.clone()