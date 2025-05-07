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

export function createSignal(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  if (signals.some((signal) => signal.aborted)) {
    controller.abort();
    return controller.signal;
  }

  function abort() {
    controller.abort();
    cleanup();
  }

  function cleanup() {
    signals.forEach((signal) => {
      signal.addEventListener("abort", abort);
    });
  }

  signals.forEach((signal) => {
    signal.addEventListener("abort", abort);
  });

  return controller.signal;
}
