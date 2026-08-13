import { describe, expect, it } from "vitest";
import { estimateRealtimeCostBrl, estimateReasoningCostBrl } from "../src/core/usage";

describe("usage estimates", () => {
  it("keeps mini realtime cheaper than quality for the same usage", () => {
    const usage = {
      inputAudioTokens: 10_000,
      outputAudioTokens: 10_000,
      inputTextTokens: 1_000,
      outputTextTokens: 1_000
    };
    expect(estimateRealtimeCostBrl(usage, "gpt-realtime-2.1-mini"))
      .toBeLessThan(estimateRealtimeCostBrl(usage, "gpt-realtime-2.1"));
  });

  it("returns zero for empty usage", () => {
    expect(estimateReasoningCostBrl(0, 0, "gpt-5.6-terra")).toBe(0);
  });
});
