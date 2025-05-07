import { Params } from "./types";

export interface SanitizeUrlOptions {
  encode?: boolean;
  preserveEncoding?: boolean;
}

export function sanitizeUrl(
  baseUrl: string,
  endpoint: string = "",
  params?: Params,
  options: SanitizeUrlOptions = {
    encode: false,
    preserveEncoding: true,
  }
): URL {
  if (typeof baseUrl !== "string" || !baseUrl.trim()) {
    throw new TypeError("Base URL must be a non-empty string");
  }

  try {
    const base = new URL(baseUrl);

    if (typeof endpoint !== "string") {
      endpoint = "";
    }

    const [rawPath, ...queryParts] = endpoint.split("?");
    const endpointQuery = queryParts.join("?");
    const basePath = base.pathname;
    let fullPath = basePath;

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
            resolvedUrl.searchParams.append(
              options.preserveEncoding ? key : encodeURIComponent(key),
              options.preserveEncoding ? value : encodeURIComponent(value)
            );
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

        const processValue = (val: string | number | boolean) =>
          options.encode ? encodeURIComponent(String(val)) : String(val);

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
    throw new Error(
      `Failed to construct URL: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function createSignal(
  ...signals: (AbortSignal | null | undefined)[]
): AbortSignal {
  const controller = new AbortController();

  const abort = () => controller.abort();

  for (const signal of signals) {
    if (!signal) continue;

    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }

    signal.addEventListener("abort", abort, { once: true });
  }

  return controller.signal;
}

export function resolveFetch(): typeof fetch {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch;
  }

  throw new Error(
    "[Wefy] No global fetch available. Please use Node.js 18+ or provide a custom fetch implementation."
  );
}
