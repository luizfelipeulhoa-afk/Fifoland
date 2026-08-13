import { describe, expect, it } from "vitest";
import {
  ACTION_APPROVAL_TTL_MS,
  approvalIsUsable,
  evaluateAction
} from "../src/core/action-broker";

describe("action broker", () => {
  it("allows local and draft work without external side effects", () => {
    expect(evaluateAction({ actionType: "memory.read", risk: "local", preview: "Ler memória" }).outcome).toBe("allow");
    expect(evaluateAction({ actionType: "task.draft", risk: "draft", preview: "Criar rascunho" }).outcome).toBe("allow");
  });

  it("requires short-lived approval for external and high-impact actions", () => {
    const decision = evaluateAction({
      actionType: "calendar.write",
      risk: "external-write",
      preview: "Criar evento"
    });
    expect(decision).toMatchObject({
      outcome: "require-approval",
      approvalTtlMs: ACTION_APPROVAL_TTL_MS
    });
  });

  it("binds approval to the exact payload and expiry", () => {
    const approval = {
      status: "approved",
      payloadHash: "abc",
      expiresAt: "2026-07-30T12:02:00.000Z"
    };
    expect(approvalIsUsable(approval, "abc", new Date("2026-07-30T12:01:00.000Z"))).toBe(true);
    expect(approvalIsUsable(approval, "changed", new Date("2026-07-30T12:01:00.000Z"))).toBe(false);
    expect(approvalIsUsable(approval, "abc", new Date("2026-07-30T12:03:00.000Z"))).toBe(false);
  });
});
