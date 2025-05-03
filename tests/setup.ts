import { beforeAll, beforeEach, afterAll, afterEach, vi } from "vitest";

beforeAll(() => {
  global.fetch = vi.fn() as typeof fetch;
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {});

afterAll(() => {
  vi.restoreAllMocks();
});
