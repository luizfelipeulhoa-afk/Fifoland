import type { MemoryRecord } from "../shared/types.js";
import { cosineSimilarity, localEmbedding } from "./embeddings.js";

const NEGATION = /\b(n[aã]o|nunca|jamais|deixei de|evito|odeio|contra)\b/i;

export interface ContradictionMatch {
  memory: MemoryRecord;
  score: number;
}

export function findPotentialContradiction(
  incoming: MemoryRecord,
  existing: MemoryRecord[]
): ContradictionMatch | undefined {
  if (incoming.category === "contradiction") return undefined;
  const incomingNegated = NEGATION.test(incoming.content);
  return existing
    .filter(
      (memory) =>
        memory.id !== incoming.id &&
        memory.category === incoming.category &&
        memory.status === "confirmed" &&
        NEGATION.test(memory.content) !== incomingNegated
    )
    .map((memory) => ({
      memory,
      score: cosineSimilarity(
        localEmbedding(`${incoming.title} ${incoming.content}`),
        localEmbedding(`${memory.title} ${memory.content}`)
      )
    }))
    .filter((match) => match.score >= 0.22)
    .sort((a, b) => b.score - a.score)[0];
}
