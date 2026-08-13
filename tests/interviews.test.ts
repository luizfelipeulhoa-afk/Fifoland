import { describe, expect, it } from "vitest";
import {
  buildVoiceInterviewPrompt,
  INTERVIEW_MODULES
} from "../src/core/interviews.js";

describe("entrevista guiada por voz", () => {
  it("cobre história, pessoas, trabalho e estudos com profundidade", () => {
    const modules = new Map(INTERVIEW_MODULES.map((module) => [module.id, module]));

    expect([...modules.keys()]).toEqual(
      expect.arrayContaining(["origins", "relationships", "work", "studies"])
    );
    for (const id of ["origins", "relationships", "work", "studies"]) {
      expect(modules.get(id)?.questions.length).toBeGreaterThanOrEqual(6);
    }
  });

  it("faz uma pergunta por turno e preserva a revisão humana", () => {
    const prompt = buildVoiceInterviewPrompt({
      module: INTERVIEW_MODULES[0],
      memories: []
    });

    expect(prompt).toContain("Faça somente UMA pergunta por turno");
    expect(prompt).toContain("salvar e encerrar");
    expect(prompt).toContain("apresente-a como hipótese e peça confirmação");
    expect(prompt).toContain("Nenhuma memória confirmada relevante");
  });

  it("mantém orientação passo a passo sem transformar entrevista em palestra", () => {
    const prompt = buildVoiceInterviewPrompt({
      module: INTERVIEW_MODULES[2],
      memories: []
    });

    expect(prompt).toContain("passos numerados, curtos e um de cada vez");
    expect(prompt).toContain("ouvir e compreender vêm primeiro");
    expect(prompt).toContain(INTERVIEW_MODULES[2].questions[0]);
  });
});
