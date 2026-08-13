import { describe, expect, it } from "vitest";
import { retrieveMemories } from "../src/core/retrieval.js";
import type { MemoryRecord } from "../src/shared/types.js";

function memory(
  id: string,
  content: string,
  overrides: Partial<MemoryRecord> = {}
): MemoryRecord {
  return {
    id,
    category: "value",
    title: `Memória ${id}`,
    content,
    source: "Teste",
    confidence: 0.9,
    sensitivity: "normal",
    status: "confirmed",
    createdAt: "2026-07-24T10:00:00.000Z",
    updatedAt: "2026-07-24T10:00:00.000Z",
    revision: 1,
    ...overrides
  };
}

describe("recuperação local", () => {
  it("prioriza conteúdo relacionado à consulta", () => {
    const results = retrieveMemories("carreira trabalho propósito", [
      memory("career", "Quero trabalho com autonomia e propósito na minha carreira"),
      memory("food", "Prefiro comida italiana e massas")
    ]);
    expect(results[0]?.memory.id).toBe("career");
  });

  it("não recupera candidatas, rejeitadas ou restritas", () => {
    const results = retrieveMemories("família importante", [
      memory("candidate", "Minha família é importante", { status: "candidate" }),
      memory("rejected", "Minha família é importante", { status: "rejected" }),
      memory("restricted", "Minha família é importante", {
        sensitivity: "restricted"
      }),
      memory("confirmed", "Minha família é importante")
    ]);
    expect(results.map((result) => result.memory.id)).toEqual(["confirmed"]);
  });
});
