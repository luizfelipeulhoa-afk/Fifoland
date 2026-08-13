import type { MemoryRecord } from "../shared/types.js";
import { cosineSimilarity, localEmbedding } from "./embeddings.js";

export interface RankedMemory {
  memory: MemoryRecord;
  score: number;
}

export function retrieveMemories(
  query: string,
  memories: MemoryRecord[],
  limit = 6
): RankedMemory[] {
  const queryVector = localEmbedding(query);
  const queryTerms = new Set(query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/\s+/).filter((term) => term.length > 2));
  const now = Date.now();
  return memories
    .filter((memory) => memory.status === "confirmed" && memory.sensitivity !== "restricted" && (!memory.expiresAt || Date.parse(memory.expiresAt) > now))
    .map((memory) => {
      const content = `${memory.title} ${memory.content} ${memory.category}`;
      const similarity = cosineSimilarity(queryVector, localEmbedding(content));
      const normalizedContent = content.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const lexical = [...queryTerms].filter((term) => normalizedContent.includes(term)).length / Math.max(1, queryTerms.size);
      const confidenceBoost = memory.confidence * 0.12;
      return { memory, score: similarity * 0.72 + lexical * 0.2 + confidenceBoost };
    })
    .filter((result) => result.score > 0.02)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
