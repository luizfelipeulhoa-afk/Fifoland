"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localEmbedding = localEmbedding;
exports.cosineSimilarity = cosineSimilarity;
const VECTOR_SIZE = 192;
function normalizeToken(token) {
    return token
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}
function hashToken(token) {
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
        hash ^= token.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash);
}
function localEmbedding(text) {
    const vector = Array(VECTOR_SIZE).fill(0);
    const tokens = text.split(/\s+/).map(normalizeToken).filter((token) => token.length > 1);
    for (const token of tokens) {
        const index = hashToken(token) % VECTOR_SIZE;
        const sign = (hashToken(`${token}:sign`) & 1) === 0 ? 1 : -1;
        vector[index] += sign * (1 + Math.min(token.length, 12) / 12);
    }
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return magnitude === 0 ? vector : vector.map((value) => value / magnitude);
}
function cosineSimilarity(a, b) {
    const size = Math.min(a.length, b.length);
    let dot = 0;
    let aMagnitude = 0;
    let bMagnitude = 0;
    for (let index = 0; index < size; index += 1) {
        dot += a[index] * b[index];
        aMagnitude += a[index] * a[index];
        bMagnitude += b[index] * b[index];
    }
    if (aMagnitude === 0 || bMagnitude === 0)
        return 0;
    return dot / (Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude));
}
