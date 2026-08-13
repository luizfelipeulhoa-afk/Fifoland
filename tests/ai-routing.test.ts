import { describe, expect, it } from "vitest";
import { aiEndpoint, chooseAiRoute } from "../src/core/ai-routing";

describe("chooseAiRoute", () => {
  it("keeps demo and cloud-disabled sessions local", () => {
    expect(
      chooseAiRoute({
        workload: "conversation",
        budgetRemainingBrl: 30,
        demoMode: true,
        allowCloud: true
      })
    ).toMatchObject({ provider: "local", reason: "demo" });
  });

  it("prefers the user's own API when configured", () => {
    expect(
      chooseAiRoute({
        workload: "conversation",
        budgetRemainingBrl: 30,
        demoMode: false,
        allowCloud: true,
        ownApiBaseUrl: "https://api.fifones.local/"
      })
    ).toMatchObject({
      provider: "fifones-api",
      baseUrl: "https://api.fifones.local",
      model: "gpt-5.6-luna"
    });
  });

  it("uses Terra for deep planning while keeping everyday conversation on Luna", () => {
    const base = { budgetRemainingBrl: 20, demoMode: false, allowCloud: true };
    expect(chooseAiRoute({ ...base, workload: "conversation" }).model).toBe("gpt-5.6-luna");
    expect(chooseAiRoute({ ...base, workload: "deep-planning" }).model).toBe("gpt-5.6-terra");
  });

  it("uses local fallback when the budget is exhausted", () => {
    expect(
      chooseAiRoute({
        workload: "conversation",
        budgetRemainingBrl: 0,
        demoMode: false,
        allowCloud: true
      })
    ).toMatchObject({ provider: "local", reason: "budget" });
  });

  it("keeps voice realtime even when text budget is low", () => {
    expect(
      chooseAiRoute({
        workload: "voice",
        budgetRemainingBrl: 0,
        demoMode: false,
        allowCloud: true,
        preferredRealtimeModel: "voice-model"
      })
    ).toMatchObject({ provider: "openai", model: "voice-model", reason: "realtime" });
  });
});

describe("aiEndpoint", () => {
  it("joins an own API base URL safely", () => {
    expect(aiEndpoint("https://api.fifones.local/", "/v1/responses")).toBe(
      "https://api.fifones.local/v1/responses"
    );
  });
});
