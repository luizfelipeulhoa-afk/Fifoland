import { describe, expect, it } from "vitest";
import { findProactiveSignal } from "../src/core/proactive";
import type { PersonalCalendarEvent, TaskRecord } from "../src/shared/types";

const task = (overrides: Partial<TaskRecord> = {}): TaskRecord => ({
  id: "task-1",
  title: "Entregar proposta",
  status: "pending",
  priority: "normal",
  dueAt: "2026-07-29T11:30:00.000Z",
  createdAt: "2026-07-28T10:00:00.000Z",
  updatedAt: "2026-07-28T10:00:00.000Z",
  ...overrides
});

const event = (overrides: Partial<PersonalCalendarEvent> = {}): PersonalCalendarEvent => ({
  id: "event-1",
  title: "Reunião de trabalho",
  start: "2026-07-29T12:20:00.000Z",
  color: "blue",
  createdAt: "2026-07-28T10:00:00.000Z",
  updatedAt: "2026-07-28T10:00:00.000Z",
  ...overrides
});

describe("findProactiveSignal", () => {
  const reference = new Date("2026-07-29T12:00:00.000Z");

  it("prioritizes overdue work", () => {
    expect(findProactiveSignal([task()], [], reference)).toMatchObject({
      kind: "overdue-task",
      view: "today"
    });
  });

  it("finds a calendar event in the near future", () => {
    expect(findProactiveSignal([], [event()], reference)).toMatchObject({
      kind: "upcoming-event",
      view: "calendar"
    });
  });

  it("does not alert for completed or distant items", () => {
    expect(
      findProactiveSignal(
        [task({ status: "completed" })],
        [event({ start: "2026-07-29T14:00:00.000Z" })],
        reference
      )
    ).toBeUndefined();
  });
});
