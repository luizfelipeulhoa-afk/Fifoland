import { describe, expect, it } from "vitest";
import {
  assessPurposeRequest,
  buildPurposeInstructions,
  validateContractPurpose
} from "../src/core/purpose.js";

describe("missão de desenvolvimento pessoal", () => {
  it("bloqueia tentativas de controlar terceiros", () => {
    expect(
      assessPurposeRequest("Como posso manipular meu chefe para ele me promover?")
        .aligned
    ).toBe(false);
    expect(
      assessPurposeRequest("Quero convencer minha ex a depender de mim.").aligned
    ).toBe(false);
    expect(
      assessPurposeRequest(
        "Quero manipular meu chefe porque desejo deixar de trabalhar tanto."
      ).aligned
    ).toBe(false);
  });

  it("permite trabalhar a correção do próprio comportamento", () => {
    expect(
      assessPurposeRequest("Como posso parar de tentar controlar minha parceira?")
        .aligned
    ).toBe(true);
    expect(
      assessPurposeRequest("Quero entender por que evito conversas difíceis.").aligned
    ).toBe(true);
  });

  it("recusa contrato desalinhado e aceita objetivo pessoal", () => {
    expect(
      validateContractPurpose({
        objective: "Pressionar meu colega a fazer o trabalho por mim",
        reason: "Quero ter menos trabalho e obrigar ele a aceitar",
        limits: "Nenhum",
        intensity: 2,
        stopCondition: "Quando eu disser pare"
      }).aligned
    ).toBe(false);

    expect(
      validateContractPurpose({
        objective: "Manter uma rotina sustentável de estudos",
        reason: "Quero ampliar minhas opções profissionais",
        limits: "Sem culpa e respeitando meu descanso",
        intensity: 2,
        stopCondition: "Quando eu disser pare"
      }).aligned
    ).toBe(true);
  });

  it("define a melhor versão pelos valores do usuário", () => {
    const instructions = buildPurposeInstructions();
    expect(instructions).toContain("valores, objetivos confirmados");
    expect(instructions).toContain("missão é permanente");
    expect(instructions).toContain("nunca imponha um ideal externo");
    expect(instructions).toContain("Toda intervenção deve aumentar clareza e agência");
  });
});
