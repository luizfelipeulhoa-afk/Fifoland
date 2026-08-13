import type { TaskDraft } from "../shared/types";

const INTENT =
  /\b(preciso|tenho que|tenho de|devo|quero fazer|vou fazer|não posso esquecer|nao posso esquecer|me lembra|me lembre|lembrar de|marca pra mim|anota pra mim)\b/i;
const WEEKDAYS: Array<[RegExp, number]> = [
  [/\bdomingo\b/i, 0],
  [/\bsegunda(?:-feira)?\b/i, 1],
  [/\bterça(?:-feira)?\b|\bterca(?:-feira)?\b/i, 2],
  [/\bquarta(?:-feira)?\b/i, 3],
  [/\bquinta(?:-feira)?\b/i, 4],
  [/\bsexta(?:-feira)?\b/i, 5],
  [/\bsábado\b|\bsabado\b/i, 6]
];

function setTime(date: Date, text: string, fallbackHour: number): void {
  const time = text.match(/\b(?:às|as)?\s*(\d{1,2})(?::|h)(\d{2})?\b/i);
  const hour = time ? Number(time[1]) : fallbackHour;
  const minute = time?.[2] ? Number(time[2]) : 0;
  date.setHours(Math.min(23, hour), Math.min(59, minute), 0, 0);
}

function parseDueDate(text: string, reference: Date): string | undefined {
  const date = new Date(reference);
  const relative = text.match(/\bem\s+(\d{1,3})\s*(minuto|minutos|min|hora|horas|h)\b/i);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    date.setTime(date.getTime() + amount * (unit.startsWith("h") || unit.startsWith("hora") ? 60 : 1) * 60_000);
    return date.toISOString();
  }
  const numeric = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (numeric) {
    const year = numeric[3]
      ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
      : reference.getFullYear();
    date.setFullYear(year, Number(numeric[2]) - 1, Number(numeric[1]));
    setTime(date, text, 9);
    if (date.getTime() < reference.getTime() && !numeric[3]) {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date.toISOString();
  }
  if (/\bamanhã\b|\bamanha\b/i.test(text)) {
    date.setDate(date.getDate() + 1);
    setTime(date, text, 9);
    return date.toISOString();
  }
  if (/\bhoje\b/i.test(text)) {
    setTime(date, text, Math.max(reference.getHours() + 1, 18));
    return date.toISOString();
  }
  for (const [pattern, weekday] of WEEKDAYS) {
    if (!pattern.test(text)) continue;
    let offset = (weekday - reference.getDay() + 7) % 7;
    if (offset === 0) offset = 7;
    date.setDate(date.getDate() + offset);
    setTime(date, text, 9);
    return date.toISOString();
  }
  return undefined;
}

function cleanTitle(text: string): string {
  return text
    .replace(/^fifones[,\s:]*/i, "")
    .replace(INTENT, "")
    .replace(/^\s*de\s+/i, "")
    .replace(/\b(me|pra mim|para mim)\b/gi, "")
    .replace(/\b(hoje|amanhã|amanha|domingo|segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado)\b/gi, "")
    .replace(/(?:às|as)?\s*\d{1,2}(?::|h)\d{0,2}\b/gi, "")
    .replace(/\s+(?:às|as)\s*$/i, "")
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, "")
    .replace(/\bem\s+\d{1,3}\s*(?:minuto|minutos|min|hora|horas|h)\b/gi, "")
    .replace(/[,.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectTaskDraft(
  text: string,
  reference = new Date()
): TaskDraft | null {
  if (!INTENT.test(text)) return null;
  const title = cleanTitle(text);
  if (title.length < 3) return null;
  const dueAt = parseDueDate(text, reference);
  const recurrence = /\btod[oa]s?\s+(?:os\s+|as\s+)?dias?\b/i.test(text)
    ? "daily"
    : /\btod[oa]\s+semana\b/i.test(text)
      ? "weekly"
      : undefined;
  const priority = /\b(urgente|prioridade|importante|sem falta)\b/i.test(text)
    ? "high"
    : "normal";
  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    dueAt,
    reminderAt: dueAt,
    recurrence,
    priority
  };
}
