export type Params = Record<
  string,
  string | number | boolean | undefined | (string | number | boolean)[]
>;

export function sanitizeUrl(
  baseUrl: string,
  endpoint: string = "",
  params?: Params
): URL {
  const [rawPath, ...queryParts] = endpoint.split("?");
  const endpointQuery = queryParts.join("?");

  const resolvedUrl = new URL(rawPath, baseUrl);

  if (endpointQuery) {
    new URLSearchParams(endpointQuery).forEach((value, key) => {
      resolvedUrl.searchParams.append(key, value);
    });
  }

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      resolvedUrl.searchParams.delete(key);

      if (value === undefined) return;

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item !== undefined) {
            resolvedUrl.searchParams.append(key, String(item));
          }
        });
      } else {
        resolvedUrl.searchParams.set(key, String(value));
      }
    });
  }

  return resolvedUrl;
}
