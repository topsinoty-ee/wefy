import { it } from "vitest";
import { expect } from "vitest";
import { describe } from "vitest";
import { Wefy } from "wefy";

describe("Core | Wefy works as intended", () => {
  it("initializes", () => {
    const client = Wefy.create();
    expect(client).toBeInstanceOf(Wefy);
  });
});
