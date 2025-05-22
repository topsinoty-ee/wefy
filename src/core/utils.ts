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

export function mergeHeaders(baseHeaders: HeadersInit, requestHeaders: HeadersInit): Headers {
  const HEADER_STRATEGIES = {
    override: new Set(['authorization', 'content-type', 'content-length', 'content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options']),
    multiValue: new Set(['set-cookie', 'www-authenticate', 'proxy-authenticate']),
    merge: new Set(['accept', 'accept-encoding', 'accept-language', 'cache-control', 'pragma', 'vary', 'warning', 'cookie', 'link', 'access-control-allow-headers', 'access-control-allow-methods', 'access-control-expose-headers'])
  };

  const PARSERS = {
    cookie: (base: string, request: string) => {
      const parse = (string: string) => {
        return Object.fromEntries(
          string.split(';')
            .map(pair => pair.trim().split('=', 2))
            .filter(([key]) => key && key.length > 0)
        );
      };
      return Object.entries({...parse(base), ...parse(request)})
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    },

    accept: (base: string, request: string) => {
      const parse = (string: string) => {
        return new Map(
          string.split(',')
            .map(str => str.trim())
            .filter(Boolean)
            .map(item => {
              const [value, ...params] = item.split(';');
              const qParam = params.find(p => p.trim().startsWith('q='));
              const quality = qParam ? parseFloat(qParam.split('=')[1]) : 1;
              return [value.trim(), {quality: isNaN(quality) ? 1 : quality, original: item}];
            })
        );
      };

      const baseMap = parse(base);
      const requestMap = parse(request);
      const merged = new Map([...baseMap, ...requestMap]);

      return Array.from(merged.entries())
        .sort(([, a], [, b]) => b.quality - a.quality)
        .map(([, {original}]) => original)
        .join(', ');
    },

    default: (base: string, request: string) => {
      const seen = new Set<string>();
      return [base, request]
        .flatMap(value =>
          value.split(',')
            .map(str => str.trim())
            .filter(Boolean)
        )
        .filter(value => {
          const lower = value.toLowerCase();
          if (seen.has(lower)) {
            return false;
          }
          seen.add(lower);
          return true;
        })
        .join(', ');
    }
  };

  const getStrategy = (key: string): keyof typeof HEADER_STRATEGIES => {
    for (const [strategy, set] of Object.entries(HEADER_STRATEGIES)) {
      if (set.has(key)) {
        return strategy as keyof typeof HEADER_STRATEGIES;
      }
    }
    return 'override';
  };

  const mergeValues = (base: string, request: string, key: string) => {
    if (key === 'cookie') {
      return PARSERS.cookie(base, request);
    } else if (key.startsWith('accept')) {
      return PARSERS.accept(base, request);
    } else {
      return PARSERS.default(base, request);
    }
  };

  const result = new Headers();
  const base = new Headers(baseHeaders);
  const request = new Headers(requestHeaders);

  // Create a map of lowercase keys to actual key names and values from request headers
  const requestLookup = new Map<string, [string, string]>();
  request.forEach((value, key) => {
    requestLookup.set(key.toLowerCase(), [key, value]);
  });

  // Get all unique header keys (case-insensitive)
  const allKeys = new Set<string>();
  base.forEach((_, key) => allKeys.add(key.toLowerCase()));
  requestLookup.forEach((_, key) => allKeys.add(key));

  allKeys.forEach(lowerKey => {
    const baseValue = base.get(lowerKey);
    const requestEntry = requestLookup.get(lowerKey);
    const [requestKey, requestValue] = requestEntry || [null, null];

    const strategy = getStrategy(lowerKey);

    // Use the request key if available, otherwise find the base key, otherwise use lowercase
    let finalKey = requestKey;
    if (!finalKey) {
      // Find the actual key from base headers
      for (const [key] of base) {
        if (key.toLowerCase() === lowerKey) {
          finalKey = key;
          break;
        }
      }
    }
    if (!finalKey) {
      finalKey = lowerKey;
    }

    if (baseValue && requestValue) {
      switch (strategy) {
        case 'override':
          result.set(finalKey, requestValue);
          break;
        case 'multiValue':
          result.append(finalKey, baseValue);
          result.append(finalKey, requestValue);
          break;
        case 'merge':
          result.set(finalKey, mergeValues(baseValue, requestValue, lowerKey));
          break;
      }
    } else if (baseValue) {
      result.set(finalKey, baseValue);
    } else if (requestValue) {
      result.set(finalKey, requestValue);
    }
  });

  return result;
}

export const clonedRes = (response: Response) => response.clone()