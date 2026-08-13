import { describe, expect, it } from "vitest";
import { isFifonesWakePhrase, normalizeWakePhrase } from "../src/core/wake";

describe("Fifones wake phrase", () => {
  it("recognizes the chosen Brazilian Portuguese call", () => {
    expect(isFifonesWakePhrase("Fala, Fifones!")).toBe(true);
    expect(isFifonesWakePhrase("fala aí fifones")).toBe(true);
  });

  it("does not wake for an isolated mention", () => {
    expect(isFifonesWakePhrase("Conversei sobre Fifones ontem")).toBe(false);
  });

  it("normalizes accents and punctuation", () => {
    expect(normalizeWakePhrase("  FALA, AÍ, FIFONES! ")).toBe("fala ai fifones");
  });
});
