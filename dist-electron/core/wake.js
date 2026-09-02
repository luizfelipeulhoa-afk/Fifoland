"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWakePhrase = normalizeWakePhrase;
exports.isFifonesWakePhrase = isFifonesWakePhrase;
function normalizeWakePhrase(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function isFifonesWakePhrase(value) {
    const normalized = normalizeWakePhrase(value);
    return /\bfala(?: ai)? fifones\b/.test(normalized);
}
