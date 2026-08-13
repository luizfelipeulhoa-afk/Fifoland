import { describe, expect, it } from "vitest";
import { decideMode, isHighRisk, isStopPhrase } from "../src/core/safety.js";
import type { PersuasionContract } from "../src/shared/types.js";

const activeContract: PersuasionContract = {
  id: "contract-1",
  objective: "Caminhar três vezes por semana",
  reason: "Quero recuperar minha energia",
  limits: "Sem culpa ou comparação",
  intensity: 2,
  stopCondition: "Quando eu disser pare",
  status: "active",
  createdAt: "2026-07-24T10:00:00.000Z"
};

describe("política de segurança", () => {
  it("bloqueia persuasão sem contrato", () => {
    const decision = decideMode("Quero mudar minha rotina", "persuasion");
    expect(decision.effectiveMode).toBe("counterpoint");
    expect(decision.contractRequired).toBe(true);
  });

  it("permite persuasão com contrato ativo", () => {
    const decision = decideMode(
      "Estou pensando em faltar à caminhada",
      "persuasion",
      activeContract
    );
    expect(decision.effectiveMode).toBe("persuasion");
    expect(decision.contractRequired).toBe(false);
  });

  it("sempre desativa persuasão em alto risco", () => {
    const decision = decideMode(
      "Devo mudar a dose do meu medicamento?",
      "persuasion",
      activeContract
    );
    expect(decision.highRisk).toBe(true);
    expect(decision.effectiveMode).toBe("reflection");
  });

  it("reconhece linguagem de crise", () => {
    expect(isHighRisk("Estou pensando em tirar minha vida")).toBe(true);
    expect(isHighRisk("Estou escolhendo onde passar as férias")).toBe(false);
  });

  it("reconhece retirada explícita de consentimento sem falso positivo amplo", () => {
    expect(isStopPhrase("Pare de me convencer")).toBe(true);
    expect(isStopPhrase("Não pare a música")).toBe(false);
  });
});
