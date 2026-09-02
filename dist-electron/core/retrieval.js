"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveMemories = retrieveMemories;
const embeddings_js_1 = require("./embeddings.js");
function retrieveMemories(query, memories, limit = 6) {
    const queryVector = (0, embeddings_js_1.localEmbedding)(query);
    const queryTerms = new Set(query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/\s+/).filter((term) => term.length > 2));
    const now = Date.now();
    return memories
        .filter((memory) => memory.status === "confirmed" && memory.sensitivity !== "restricted" && (!memory.expiresAt || Date.parse(memory.expiresAt) > now))
        .map((memory) => {
        const content = `${memory.title} ${memory.content} ${memory.category}`;
        const similarity = (0, embeddings_js_1.cosineSimilarity)(queryVector, (0, embeddings_js_1.localEmbedding)(content));
        const normalizedContent = content.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const lexical = [...queryTerms].filter((term) => normalizedContent.includes(term)).length / Math.max(1, queryTerms.size);
        const confidenceBoost = memory.confidence * 0.12;
        return { memory, score: similarity * 0.72 + lexical * 0.2 + confidenceBoost };
    })
        .filter((result) => result.score > 0.02)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}
