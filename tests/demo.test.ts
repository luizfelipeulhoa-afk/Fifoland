import { describe, expect, it } from "vitest";
import { demoAdvisorResponse } from "../src/core/demo.js";

describe("modo demonstração", () => {
  it("responde a uma saudação apresentando a missão e buscando contexto", () => {
    const response = demoAdvisorResponse({
      text: "oie",
      mode: "reflection",
      memories: [],
      highRisk: false,
      contractRequired: false
    });

    expect(response).toContain("Sua melhor versão precisa nascer dos seus valores");
    expect(response).toContain("O que você mais quer entender ou desenvolver");
  });
});
