import type { SkillRisk } from "../shared/types";

export interface ActionIntent {
  actionType: string;
  risk: SkillRisk;
  preview: string;
}

export interface ActionPolicyDecision {
  outcome: "allow" | "require-approval";
  approvalTtlMs?: number;
  reason: string;
}

export const ACTION_APPROVAL_TTL_MS = 120_000;

/**
 * Deterministic boundary between model suggestions and side effects.
 * The model may describe an action, but only this policy decides whether it
 * can move forward. External and high-impact writes are never implicit.
 */
export function evaluateAction(intent: ActionIntent): ActionPolicyDecision {
  if (intent.risk === "external-write" || intent.risk === "high-impact") {
    return {
      outcome: "require-approval",
      approvalTtlMs: ACTION_APPROVAL_TTL_MS,
      reason: "A ação altera um sistema externo ou tem impacto elevado."
    };
  }

  return {
    outcome: "allow",
    reason:
      intent.risk === "draft"
        ? "O resultado permanece como rascunho local."
        : "A ação permanece somente neste computador."
  };
}

export function approvalIsUsable(
  approval: { status: string; expiresAt: string; payloadHash: string },
  payloadHash: string,
  at = new Date()
): boolean {
  return (
    approval.status === "approved" &&
    approval.payloadHash === payloadHash &&
    new Date(approval.expiresAt).getTime() > at.getTime()
  );
}
