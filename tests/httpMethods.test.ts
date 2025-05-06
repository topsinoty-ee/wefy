import { describe, beforeEach, vi, afterAll, it, expect } from "vitest";
import { WefyConfig, Wefy } from "../src/core";

describe("HTTP Methods", () => {
  const config: WefyConfig = {
    baseUrl: "https://api.example.com",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  const httpMethods = [
    { method: "get", hasBody: false },
    { method: "post", hasBody: true },
    { method: "put", hasBody: true },
    { method: "patch", hasBody: true },
    { method: "delete", hasBody: true },
    { method: "head", hasBody: false },
    { method: "options", hasBody: false },
  ];

  httpMethods.forEach(({ method, hasBody }) => {
    describe(method.toUpperCase(), () => {
      it(`makes ${method.toUpperCase()} request`, async () => {
        const client = Wefy.create(config);
        await client[method]("/test");

        const [, init] = vi.mocked(fetch).mock.calls[0];
        expect(init?.method).toBe(method.toUpperCase());
      });

      it(`${
        hasBody ? "accepts" : "ignores"
      } body for ${method.toUpperCase()}`, async () => {
        const client = Wefy.create(config);
        await client[method]("/test", { body: "test" } as any);

        const [, init] = vi.mocked(fetch).mock.calls[0];
        if (hasBody) {
          expect(init?.body).toBe("test");
        } else {
          expect(init?.body).toBeFalsy();
        }
      });

      it(`handles ${method.toUpperCase()} errors`, async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
          new Response(null, { status: 500 })
        );

        const client = Wefy.create(config);
        await expect(client[method]("/test")).rejects.toThrow();
      });
    });
  });

  describe("Special Cases", () => {
    it("handles array parameters correctly", async () => {
      const client = Wefy.create(config);
      await client.get("/test", { params: { ids: [1, 2, 3] } });

      const [url] = vi.mocked(fetch).mock.calls[0];
      expect(url).toContain("ids=1&ids=2&ids=3");
    });

    it("handles FormData with files", async () => {
      const formData = new FormData();
      const file = new File(["content"], "test.txt", { type: "text/plain" });
      formData.append("file", file);

      const client = Wefy.create(config);
      await client.post("/upload", { body: formData });

      const [, init] = vi.mocked(fetch).mock.calls[0];
      expect(init?.body).toBeInstanceOf(FormData);
    });

    it("handles binary responses", async () => {
      const buffer = new ArrayBuffer(8);
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(buffer, {
          status: 200,
          headers: { "Content-Type": "application/octet-stream" },
        })
      );

      const client = Wefy.create(config);
      const response = await client.get("/binary");
      expect(response).toBeInstanceOf(ArrayBuffer);
    });

    it("handles abort signal", async () => {
      const abortController = new AbortController();
      const client = Wefy.create(config);

      const promise = client.get("/test", {
        options: { signal: abortController.signal },
      });

      abortController.abort();

      await expect(promise).rejects.toThrow();
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: abortController.signal })
      );
    });
  });
});
