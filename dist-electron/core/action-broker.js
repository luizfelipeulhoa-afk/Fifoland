"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTION_APPROVAL_TTL_MS = void 0;
exports.evaluateAction = evaluateAction;
exports.approvalIsUsable = approvalIsUsable;
exports.ACTION_APPROVAL_TTL_MS = 120_000;
/**
 * Deterministic boundary between model suggestions and side effects.
 * The model may describe an action, but only this policy decides whether it
 * can move forward. External and high-impact writes are never implicit.
 */
function evaluateAction(intent) {
    if (intent.risk === "external-write" || intent.risk === "high-impact") {
        return {
            outcome: "require-approval",
            approvalTtlMs: exports.ACTION_APPROVAL_TTL_MS,
            reason: "A ação altera um sistema externo ou tem impacto elevado."
        };
    }
    return {
        outcome: "allow",
        reason: intent.risk === "draft"
            ? "O resultado permanece como rascunho local."
            : "A ação permanece somente neste computador."
    };
}
function approvalIsUsable(approval, payloadHash, at = new Date()) {
    return (approval.status === "approved" &&
        approval.payloadHash === payloadHash &&
        new Date(approval.expiresAt).getTime() > at.getTime());
}
