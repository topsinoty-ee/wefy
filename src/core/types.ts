export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type Params = Record<
  string,
  string | number | boolean | undefined | (string | number | boolean)[]
>;
