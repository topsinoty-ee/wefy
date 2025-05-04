import { it, expect, describe, afterAll, beforeEach, vi } from "vitest";
import { Wefy, WefyConfig } from "../src/";

type FetchCall = [string, RequestInit];

describe("Core | Wefy", () => {
  const config: WefyConfig = {
    baseUrl: "https://api.example.com",
    options: { headers: { "X-Header": "value" } },
  };

  const getFetchCall = (): FetchCall =>
    vi.mocked(fetch).mock.calls[0] as FetchCall;

  const expectHeader = (key: string, value: string) => {
    const [, init] = getFetchCall();
    expect(new Headers(init.headers).get(key)).toBe(value);
  };

  const mockSuccessResponse = (data: any = { success: true }) =>
    new Response(JSON.stringify(data), { status: 200 });

  const mockErrorResponse = (status = 500) => new Response(null, { status });

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue(mockSuccessResponse());
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("throws without config", () => {
      expect(() => Wefy.create(undefined as unknown as WefyConfig)).toThrow(
        "Weaver created without config"
      );
    });

    it("initializes with config", () => {
      expect(Wefy.create(config)).toBeInstanceOf(Wefy);
    });
  });

  describe("Request Execution", () => {
    it("calls fetch with correct URL/method", async () => {
      const client = Wefy.create(config);
      await client.get("/test");

      const [url, init] = getFetchCall();
      expect(url).toBe("https://api.example.com/test");
      expect(init.method).toBe("GET");
    });

    it("handles query parameters", async () => {
      const client = Wefy.create(config);
      await client.get("/test", { params: { foo: "bar", arr: [1, 2] } });

      const [url] = getFetchCall();
      expect(url).toMatch(/foo=bar/);
      expect(url).toMatch(/arr=1&arr=2/);
    });
  });

  describe("Headers", () => {
    it("merges global and request headers", async () => {
      const client = Wefy.create(config);
      await client.get("/test", {
        options: { headers: { "Content-Type": "application/json" } },
      });

      expectHeader("Content-Type", "application/json");
      expectHeader("X-Header", "value");
    });

    it("overrides global headers", async () => {
      const client = Wefy.create(config);
      await client.get("/test", {
        options: { headers: { "X-Header": "new-value" } },
      });

      expectHeader("X-Header", "new-value");
    });
  });

  describe("Response Handling", () => {
    it("returns parsed JSON", async () => {
      const client = Wefy.create(config);
      const data = { success: true };
      vi.mocked(fetch).mockResolvedValue(mockSuccessResponse(data));

      await expect(client.get("/test")).resolves.toEqual(data);
    });

    it("throws on fetch rejection", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));
      const client = Wefy.create(config);

      await expect(client.get("/test")).rejects.toThrow("Network error");
    });

    it("throws on non-OK responses", async () => {
      vi.mocked(fetch).mockResolvedValue(mockErrorResponse(404));
      const client = Wefy.create(config);

      await expect(client.get("/test")).rejects.toThrow();
    });

    it("throws on invalid JSON", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("invalid-json"));
      const client = Wefy.create(config);

      await expect(client.get("/test")).rejects.toThrow();
    });
  });
});
