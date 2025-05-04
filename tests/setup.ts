import { beforeAll, beforeEach, afterAll, afterEach, vi } from "vitest";

beforeAll(() => {
  global.fetch = vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue({ success: true }),
    status: 200,
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {});

afterAll(() => {
  vi.restoreAllMocks();
});
