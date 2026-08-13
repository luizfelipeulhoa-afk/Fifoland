import { describe, expect, it } from "vitest";
import { buildAdvisorPrompt } from "../src/core/prompts.js";
import type { MemoryRecord } from "../src/shared/types.js";

const valueMemory: MemoryRecord = {
  id: "memory-value",
  category: "value",
  title: "Autonomia",
  content: "Prefiro decisões reversíveis e com espaço para aprender.",
  source: "Entrevista",
  confidence: 0.91,
  sensitivity: "normal",
  status: "confirmed",
  createdAt: "2026-07-24T10:00:00.000Z",
  updatedAt: "2026-07-24T10:00:00.000Z",
  revision: 1
};

describe("prompt do conselheiro", () => {
  it("inclui rastreabilidade, formato e limites", () => {
    const prompt = buildAdvisorPrompt({
      mode: "counterpoint",
      memories: [valueMemory],
      highRisk: false
    });
    expect(prompt).toContain("[M1|memory-value]");
    expect(prompt).toContain("Não invente lembranças");
    expect(prompt).toContain("A decisão continua sua");
    expect(prompt).toContain("Modo CONTRADITÓRIO");
    expect(prompt).toContain("MISSÃO EXCLUSIVA DO FIFONES");
    expect(prompt).toContain("O usuário se chama Fifo");
    expect(prompt).toContain("espaço para resenha");
    expect(prompt).toContain("faça UMA pergunta espontânea");
    expect(prompt).toContain("Não funcione como assistente genérico");
    expect(prompt).toContain("desafio construtivo");
    expect(prompt).toContain("melhor amigo maduro da faculdade");
    expect(prompt).toContain("caricature sotaque carioca");
    expect(prompt).toContain("'sem zoeira'");
  });

  it("declara ausência de memória em vez de preencher lacunas", () => {
    const prompt = buildAdvisorPrompt({
      mode: "simulation",
      memories: [],
      highRisk: false
    });
    expect(prompt).toContain("Nenhuma memória relevante confirmada");
  });

  it("adapta o conselho por voz para uma conversa passo a passo", () => {
    const prompt = buildAdvisorPrompt({
      mode: "reflection",
      memories: [],
      highRisk: false,
      voice: true
    });

    expect(prompt).toContain("um passo numerado de cada vez");
    expect(prompt).toContain("Faça apenas uma pergunta por vez");
    expect(prompt).not.toContain("Use quatro blocos curtos");
  });
});
