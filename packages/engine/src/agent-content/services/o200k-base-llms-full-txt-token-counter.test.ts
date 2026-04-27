import { describe, expect, it } from "vitest";
import { O200kBaseLlmsFullTxtTokenCounter } from "./o200k-base-llms-full-txt-token-counter";

describe("O200kBaseLlmsFullTxtTokenCounter", (): void => {
  it("returns exact o200k_base token counts for local llms-full text", (): void => {
    const counter = new O200kBaseLlmsFullTxtTokenCounter();

    const tokenCount = counter.count("# Example Docs\n\nHello agents.\n");

    expect(tokenCount).toEqual(7);
  });
});
