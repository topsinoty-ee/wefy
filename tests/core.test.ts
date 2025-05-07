import {
  it,
  expect,
  describe,
  afterAll,
  beforeEach,
  vi,
  afterEach,
} from "vitest";
import { Wefy, WefyConfig, WefyError } from "../src/core";

type FetchCall = [string, RequestInit];

describe("Core | Wefy", () => {
  const baseUrl = "https://api.example.com";
  const config: WefyConfig = {
    baseUrl,
    options: {
      headers: { "X-Header": "value" },
      credentials: "include",
    },
  };

  const getFetchCall = (index = 0): FetchCall =>
    vi.mocked(fetch).mock.calls[index] as FetchCall;

  const expectHeader = (key: string, value: string, index = 0) => {
    const [, init] = getFetchCall(index);
    expect(new Headers(init.headers).get(key)).toBe(value);
  };

  const mockSuccessResponse = (
    data: any = { success: true },
    headers: Record<string, string> = {}
  ) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...headers },
    });

  const mockErrorResponse = (status = 500, data?: any) =>
    new Response(data ? JSON.stringify(data) : null, {
      status,
      headers: { "Content-Type": data ? "application/json" : "text/plain" },
    });

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue(mockSuccessResponse());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("initializes with string baseUrl", () => {
      expect(Wefy.create(baseUrl)).toBeInstanceOf(Wefy);
    });

    it("initializes with config object", () => {
      expect(Wefy.create(config)).toBeInstanceOf(Wefy);
    });

    it("preserves config options", async () => {
      const client = Wefy.create(config);
      await client.get("/test");
      expectHeader("X-Header", "value");
      expect(getFetchCall()[1].credentials).toBe("include");
    });
  });

  describe("Invalid Configuration", () => {
    it("throws when baseUrl is empty", () => {
      expect(() => Wefy.create("")).toThrow(WefyError);
      expect(() => Wefy.create("")).toThrow("Base URL is required");
    });

    it("throws when baseUrl is invalid", () => {
      expect(() => Wefy.create("example.com")).toThrow(WefyError);
      expect(() => Wefy.create("ftp://example.com")).toThrow(WefyError);
    });

    it("throws when baseUrl is not a string", () => {
      // @ts-expect-error testing invalid input
      expect(() => Wefy.create({ baseUrl: 123 })).toThrow(WefyError);
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

    it("handles endpoints with leading/trailing slashes", async () => {
      const client = Wefy.create(config);
      await client.get("test/");
      expect(getFetchCall()[0]).toBe("https://api.example.com/test/");

      await client.get("test");
      expect(getFetchCall()[0]).toBe("https://api.example.com/test");

      await client.get("/test");
      expect(getFetchCall()[0]).toBe("https://api.example.com/test");

      await client.get("/test/");
      expect(getFetchCall()[1][0]).toBe("https://api.example.com/test/");
    });

    it("handles query parameters", async () => {
      const client = Wefy.create(config);
      await client.get("/test", {
        params: {
          foo: "bar",
          arr: [1, 2],
          special: "a b&c=d",
          empty: "",
          zero: 0,
          false: false,
        },
        encode: false,
      });

      const [url] = getFetchCall();
      const searchParams = new URL(url).searchParams;

      expect(searchParams.get("foo")).toBe("bar");
      expect(searchParams.getAll("arr")).toEqual(["1", "2"]);
      expect(searchParams.get("special")).toBe("a b&c=d");
      expect(searchParams.get("empty")).toBe("");
      expect(searchParams.get("zero")).toBe("0");
      expect(searchParams.get("false")).toBe("false");
    });

    it("handles URL with existing query parameters", async () => {
      const client = Wefy.create(config);
      await client.get("/test?existing=1", {
        params: { new: "2" },
      });

      const [url] = getFetchCall();
      expect(url).toMatch(/existing=1&new=2/);
    });

    it("handles undefined/null params", async () => {
      const client = Wefy.create(config);
      await client.get("/test", {
        params: {
          defined: "value",
          nullVal: null,
          undefinedVal: undefined,
        } as any,
      });

      const [url] = getFetchCall();
      expect(url).toBe("https://api.example.com/test?defined=value");
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

    it("handles header case insensitivity", async () => {
      const client = Wefy.create({
        baseUrl,
        options: { headers: { "X-Custom": "original" } },
      });

      await client.get("/test", {
        options: { headers: { "x-custom": "override" } },
      });

      expectHeader("X-Custom", "override");
    });

    it("does not send undefined headers", async () => {
      const client = Wefy.create(config);
      await client.get("/test", {
        options: { headers: { "X-Test": undefined } as any },
      });

      const [, init] = getFetchCall();
      expect(new Headers(init.headers)).not.toHaveProperty("X-Test");
    });
  });

  describe("Response Handling", () => {
    it("returns parsed JSON", async () => {
      const client = Wefy.create(config);
      const data = { success: true, nested: { value: 1 } };
      vi.mocked(fetch).mockResolvedValueOnce(mockSuccessResponse(data));

      const response = await client.get("/test");
      expect(response).toEqual(data);
    });

    it("handles empty 204 responses", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );
      const client = Wefy.create(config);

      await expect(client.get("/test")).resolves.toMatchObject({
        body: null,
        status: 204,
      });
    });

    it("handles text responses", async () => {
      const text = "plain text response";
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(text, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        })
      );
      const client = Wefy.create(config);

      await expect(client.get("/text")).resolves.toBe(text);
    });

    it("throws on non-OK responses with error message", async () => {
      const errorData = { error: "Not found", code: 404 };
      vi.mocked(fetch).mockResolvedValueOnce(mockErrorResponse(404, errorData));
      const client = Wefy.create(config);

      await expect(client.get("/test")).rejects.toThrow("Not found");
    });

    it("throws on malformed JSON", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response("invalid json", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
      const client = Wefy.create(config);

      await expect(client.get("/test")).rejects.toThrow();
    });

    it("includes status code in error for failed requests", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockErrorResponse(403));
      const client = Wefy.create(config);

      try {
        await client.get("/test");
      } catch (error) {
        expect(error).toBeInstanceOf(WefyError);
        expect(error.message).toContain("403");
      }
    });
  });

  describe("Body Handling", () => {
    it("sends JSON body for POST", async () => {
      const client = Wefy.create(config);
      const body = { key: "value" };
      await client.post("/test", {
        body: JSON.stringify(body),
      });

      const [, init] = getFetchCall();
      expect(init.body).toBe(JSON.stringify(body));
      expectHeader("Content-Type", "application/json");
    });

    it("sends FormData body without Content-Type", async () => {
      const client = Wefy.create(config);
      const formData = new FormData();
      formData.append("file", new Blob(["test"]));

      await client.post("/upload", { body: formData });

      const [, init] = getFetchCall();
      expect(init.body).toBeInstanceOf(FormData);
      expect(new Headers(init.headers).get("Content-Type")).toBeNull();
    });

    it("sends URLSearchParams body with correct Content-Type", async () => {
      const client = Wefy.create(config);
      const params = new URLSearchParams({ key: "value" });

      await client.post("/test", { body: params });

      const [, init] = getFetchCall();
      expect(init.body?.toString()).toBe(params.toString());
      expectHeader(
        "Content-Type",
        "application/x-www-form-urlencoded;charset=UTF-8"
      );
    });

    it("sends string body as-is", async () => {
      const client = Wefy.create(config);
      const body = "plain text";

      await client.post("/test", { body });

      const [, init] = getFetchCall();
      expect(init.body).toBe(body);
      expectHeader("Content-Type", "text/plain");
    });

    it("does not send body for GET/HEAD", async () => {
      const client = Wefy.create(config);
      await client.get("/test", { body: "should not be sent" } as any);
      expect(getFetchCall(0)[1].body).toBeUndefined();

      await client.head("/test", { body: "should not be sent" } as any);
      expect(getFetchCall(1)[1].body).toBeUndefined();
    });
  });

  describe("Concurrent Requests", () => {
    it("handles multiple concurrent requests", async () => {
      const client = Wefy.create(config);

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockSuccessResponse({ id: 1 }))
        .mockResolvedValueOnce(mockSuccessResponse({ id: 2 }));

      const [res1, res2] = await Promise.all([
        client.get("/test/1"),
        client.get("/test/2"),
      ]);

      expect(res1).toEqual({ id: 1 });
      expect(res2).toEqual({ id: 2 });

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
      expect(getFetchCall(0)[0]).toContain("/test/1");
      expect(getFetchCall(1)[0]).toContain("/test/2");
    });
  });
});
