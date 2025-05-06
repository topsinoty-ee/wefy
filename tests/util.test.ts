import { describe, it, expect } from "vitest";
import { sanitizeUrl } from "../src/core/utils";

describe("Utils | sanitizeUrl", () => {
  const BASE_URL = "https://api.example.com";

  it("throws for invalid base URL", () => {
    expect(() => sanitizeUrl("", "/test")).toThrow();
    expect(() => sanitizeUrl("invalid-url", "/test")).toThrow();
  });

  describe("URL Path Construction", () => {
    const pathCombinations = [
      { base: BASE_URL, endpoint: "path", expected: `${BASE_URL}/path` },
      { base: `${BASE_URL}/`, endpoint: "path", expected: `${BASE_URL}/path` },
      { base: BASE_URL, endpoint: "/path", expected: `${BASE_URL}/path` },
      { base: `${BASE_URL}/`, endpoint: "/path", expected: `${BASE_URL}/path` },
      {
        base: `${BASE_URL}/v1`,
        endpoint: "/path",
        expected: `${BASE_URL}/v1/path`,
      },
      {
        base: `${BASE_URL}/v1/`,
        endpoint: "path",
        expected: `${BASE_URL}/v1/path`,
      },
    ];

    pathCombinations.forEach(({ base, endpoint, expected }) => {
      it(`correctly joins ${base} + ${endpoint}`, () => {
        const url = sanitizeUrl(base, endpoint);
        expect(url.toString()).toEqual(expected);
      });
    });

    it("handles empty endpoint", () => {
      const url = sanitizeUrl(BASE_URL, "");
      expect(url.toString()).toEqual(`${BASE_URL}/`);
    });

    it("handles special characters in endpoint", () => {
      const url = sanitizeUrl(BASE_URL, "/test path/with@special&chars");
      expect(url.toString()).toEqual(
        `${BASE_URL}/test%20path/with@special&chars`
      );
    });
  });

  describe("Query Parameters", () => {
    it("handles basic params", () => {
      const url = sanitizeUrl(BASE_URL, "/test", {
        a: "1",
        b: 2,
        c: true,
      });
      expect(url.search).toContain("a=1&b=2&c=true");
    });

    it("handles array params", () => {
      const url = sanitizeUrl(BASE_URL, "/test", {
        ids: [1, 2, 3],
        flags: [true, false],
      });
      expect(url.searchParams.getAll("ids")).toEqual(["1", "2", "3"]);
      expect(url.searchParams.getAll("flags")).toEqual(["true", "false"]);
    });

    it("handles existing query in endpoint", () => {
      const url = sanitizeUrl(BASE_URL, "/test?existing=1", {
        new: "2",
      });
      expect(url.searchParams.get("existing")).toBe("1");
      expect(url.searchParams.get("new")).toBe("2");
    });

    it("handles special characters in params", () => {
      const url = sanitizeUrl(BASE_URL, "/test", {
        query: "a b c",
        symbol: "&=",
      });
      expect(url.searchParams.get("query")).toBe("a b c");
      expect(url.searchParams.get("symbol")).toBe("&=");
    });

    it("skips undefined/null params", () => {
      const url = sanitizeUrl(BASE_URL, "/test", {
        keep: "value",
        skip: undefined,
        nullVal: null,
      } as any);
      expect(url.searchParams.has("skip")).toBe(false);
      expect(url.searchParams.has("nullVal")).toBe(false);
      expect(url.searchParams.get("keep")).toBe("value");
    });

    it("handles empty string params", () => {
      const url = sanitizeUrl(BASE_URL, "/test", {
        empty: "",
      });
      expect(url.searchParams.get("empty")).toBe("");
    });
  });

  describe("Edge Cases", () => {
    it("handles very long URLs", () => {
      const longPath = "/" + "a".repeat(2000);
      const url = sanitizeUrl(BASE_URL, longPath);
      expect(url.toString()).toHaveLength(2000 + BASE_URL.length + 1);
    });

    it("handles malformed existing query", () => {
      const url = sanitizeUrl(BASE_URL, "/test?existing&another=", {
        new: "value",
      });
      expect(url.searchParams.get("existing")).toBe("");
      expect(url.searchParams.get("another")).toBe("");
      expect(url.searchParams.get("new")).toBe("value");
    });

    it("handles complex nested objects in params", () => {
      const url = sanitizeUrl(BASE_URL, "/test", {
        obj: { toString: () => "stringified" } as any,
      });
      expect(url.searchParams.get("obj")).toBe("stringified");
    });
  });
});
