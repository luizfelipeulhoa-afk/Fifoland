import { describe, expect, it } from "vitest";
import { detectTaskDraft } from "../src/core/task-intent";

describe("task intent", () => {
  const fridayReference = new Date("2026-07-24T12:00:00-03:00");

  it("creates a draft from a natural Portuguese obligation", () => {
    const draft = detectTaskDraft(
      "Fifones, preciso preparar a aula sexta às 18h",
      fridayReference
    );
    expect(draft?.title).toBe("Preparar a aula");
    expect(draft?.dueAt).toBeTruthy();
    expect(new Date(draft!.dueAt!).getDay()).toBe(5);
    expect(new Date(draft!.dueAt!).getHours()).toBe(18);
  });

  it("does not turn ordinary conversation into a task", () => {
    expect(detectTaskDraft("Eu gostei muito da aula de hoje", fridayReference)).toBeNull();
  });

  it("detects urgency and recurrence", () => {
    const draft = detectTaskDraft(
      "Tenho que revisar o treino urgente toda semana",
      fridayReference
    );
    expect(draft?.priority).toBe("high");
    expect(draft?.recurrence).toBe("weekly");
  });

  it("creates a reminder relative to the current time", () => {
    const reference = new Date("2026-07-30T10:00:00.000Z");
    const draft = detectTaskDraft("Fifones, me lembre de ligar para Ana em 2 horas", reference);
    expect(draft?.title).toBe("Ligar para Ana");
    expect(draft?.reminderAt).toBe("2026-07-30T12:00:00.000Z");
  });
});
