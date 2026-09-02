"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPotentialContradiction = findPotentialContradiction;
const embeddings_js_1 = require("./embeddings.js");
const NEGATION = /\b(n[aã]o|nunca|jamais|deixei de|evito|odeio|contra)\b/i;
function findPotentialContradiction(incoming, existing) {
    if (incoming.category === "contradiction")
        return undefined;
    const incomingNegated = NEGATION.test(incoming.content);
    return existing
        .filter((memory) => memory.id !== incoming.id &&
        memory.category === incoming.category &&
        memory.status === "confirmed" &&
        NEGATION.test(memory.content) !== incomingNegated)
        .map((memory) => ({
        memory,
        score: (0, embeddings_js_1.cosineSimilarity)((0, embeddings_js_1.localEmbedding)(`${incoming.title} ${incoming.content}`), (0, embeddings_js_1.localEmbedding)(`${memory.title} ${memory.content}`))
    }))
        .filter((match) => match.score >= 0.22)
        .sort((a, b) => b.score - a.score)[0];
}
