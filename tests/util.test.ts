import { describe, it, expect } from "vitest";
import { sanitizeUrl } from "../src/core/utils";

describe("Utils | sanitizeUrl", () => {
  const BASE_URL = "https://api.example.com";

  const pathCombinations = [
    {
      base: BASE_URL,
      endpoint: "some-endpoint",
      expected: `${BASE_URL}/some-endpoint`,
    },
    {
      base: `${BASE_URL}/`,
      endpoint: "some-endpoint",
      expected: `${BASE_URL}/some-endpoint`,
    },
    {
      base: `${BASE_URL}/`,
      endpoint: "/some-endpoint",
      expected: `${BASE_URL}/some-endpoint`,
    },
    {
      base: BASE_URL,
      endpoint: "/some-endpoint",
      expected: `${BASE_URL}/some-endpoint`,
    },
  ];

  pathCombinations.forEach(({ base, endpoint, expected }) => {
    it(`correctly joins ${base} + ${endpoint}`, () => {
      const url = sanitizeUrl(base, endpoint);
      expect(url).toBeInstanceOf(URL);
      expect(url.toString()).toEqual(expected);
    });
  });

  const paramTestCases = [
    {
      description: "basic params",
      params: { bool: true, string: "string" },
      expected: "bool=true&string=string",
    },
    {
      description: "malformed existing query",
      endpoint: "some-endpoint?red",
      params: { bool: true, string: "string" },
      expected: "red=&bool=true&string=string",
    },
    {
      description: "array params",
      params: { key: [true, "string", 12] },
      expected: "key=true&key=string&key=12",
    },
    {
      description: "mixed params with existing query",
      endpoint: "some-endpoint?existing=val",
      params: { bool: true, arr: [1, 2] },
      expected: "existing=val&bool=true&arr=1&arr=2",
    },
  ];

  paramTestCases.forEach(({ description, endpoint = "", params, expected }) => {
    it(`handles ${description}`, () => {
      const url = sanitizeUrl(BASE_URL, endpoint, params);
      expect(url.toString()).toContain(expected);
      expect(url.searchParams.toString()).toContain(
        expected.split("?").pop() || ""
      );
    });
  });

  it("handles empty endpoint", () => {
    const url = sanitizeUrl(BASE_URL, "");
    expect(url.toString()).toEqual(BASE_URL + "/");
  });

  it("handles undefined params", () => {
    const url = sanitizeUrl(BASE_URL, "endpoint", undefined);
    expect(url.toString()).toEqual(`${BASE_URL}/endpoint`);
  });
});
