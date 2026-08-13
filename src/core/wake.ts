export function normalizeWakePhrase(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isFifonesWakePhrase(value: string) {
  const normalized = normalizeWakePhrase(value);
  return /\bfala(?: ai)? fifones\b/.test(normalized);
}
