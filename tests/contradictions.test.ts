import { describe, expect, it } from "vitest";
import { findPotentialContradiction } from "../src/core/contradictions.js";
import type { MemoryRecord } from "../src/shared/types.js";

function record(id: string, content: string): MemoryRecord {
  return {
    id,
    category: "preference",
    title: "Trabalho em equipe",
    content,
    source: "Teste",
    confidence: 0.9,
    sensitivity: "normal",
    status: "confirmed",
    createdAt: "2026-07-24T10:00:00.000Z",
    updatedAt: "2026-07-24T10:00:00.000Z",
    revision: 1
  };
}

describe("contradições candidatas", () => {
  it("sinaliza afirmações relacionadas com polaridade oposta", () => {
    const previous = record(
      "previous",
      "Gosto de trabalhar em equipe e conversar para resolver problemas"
    );
    const incoming = record(
      "incoming",
      "Não gosto de trabalhar em equipe e evito conversar para resolver problemas"
    );
    expect(findPotentialContradiction(incoming, [previous])?.memory.id).toBe(
      "previous"
    );
  });

  it("não transforma toda atualização em contradição", () => {
    const previous = record("previous", "Gosto de trabalhar em equipe");
    const incoming = record("incoming", "Gosto de trabalhar em equipe pequena");
    expect(findPotentialContradiction(incoming, [previous])).toBeUndefined();
  });
});
