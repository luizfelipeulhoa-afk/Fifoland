import { describe, expect, it } from "vitest";
import { resolveLocalVoiceCommand } from "../src/core/local-voice-commands";
import type { PersonalCalendarEvent, TaskRecord } from "../src/shared/types";

const now = new Date("2026-07-30T12:30:00-03:00");

describe("local voice commands", () => {
  it("answers time without an AI request", () => {
    const answer = resolveLocalVoiceCommand("Que horas sao?", {
      now, tasks: [], events: [], language: "pt-BR"
    });
    expect(answer).toContain("12:30");
  });

  it("lists pending tasks and ignores completed ones", () => {
    const base = {
      dueAt: undefined,
      priority: "normal" as const,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    const tasks: TaskRecord[] = [
      { ...base, id: "1", title: "Comprar leite", status: "pending" },
      { ...base, id: "2", title: "Treino antigo", status: "completed" }
    ];
    const answer = resolveLocalVoiceCommand("Quais sao minhas tarefas?", {
      now, tasks, events: [], language: "pt-BR"
    });
    expect(answer).toContain("Comprar leite");
    expect(answer).not.toContain("Treino antigo");
  });

  it("reports the next event in English", () => {
    const events: PersonalCalendarEvent[] = [{
      id: "event-1",
      title: "Practice",
      start: "2026-07-30T18:00:00-03:00",
      color: "blue",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }];
    const answer = resolveLocalVoiceCommand("What is my next event?", {
      now, tasks: [], events, language: "en-US"
    });
    expect(answer).toContain("Practice");
  });
});
