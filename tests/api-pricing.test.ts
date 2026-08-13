import { describe, expect, it } from "vitest";
import { estimateTextCostBrl, responseCostBrl } from "../api/pricing";

describe("Fifones API pricing", () => {
  it("prices Luna below Terra and Sol for identical usage", () => {
    const usage = { input_tokens: 100_000, output_tokens: 10_000 };
    const luna = estimateTextCostBrl("gpt-5.6-luna", usage);
    const terra = estimateTextCostBrl("gpt-5.6-terra", usage);
    const sol = estimateTextCostBrl("gpt-5.6-sol", usage);
    expect(luna).toBeLessThan(terra);
    expect(terra).toBeLessThan(sol);
  });

  it("charges cached input at the documented discounted rate", () => {
    const uncached = estimateTextCostBrl("gpt-5.6-luna", { input_tokens: 100_000 });
    const cached = estimateTextCostBrl("gpt-5.6-luna", {
      input_tokens: 100_000,
      input_tokens_details: { cached_tokens: 100_000 }
    });
    expect(cached).toBeCloseTo(uncached / 10, 6);
  });

  it("reads usage from a completed streaming response event", () => {
    expect(responseCostBrl({
      response: { model: "gpt-5.6-luna", usage: { input_tokens: 1_000, output_tokens: 500 } }
    })).toBeGreaterThan(0);
  });
});
