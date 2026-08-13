export interface TextUsage {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { cached_tokens?: number };
}

interface TextRates {
  input: number;
  cachedInput: number;
  output: number;
}

const TEXT_RATES_PER_MILLION: Record<string, TextRates> = {
  "gpt-5.6-luna": { input: 1, cachedInput: 0.1, output: 6 },
  "gpt-5.6-terra": { input: 2.5, cachedInput: 0.25, output: 15 },
  "gpt-5.6-sol": { input: 5, cachedInput: 0.5, output: 30 },
  "gpt-5.6": { input: 5, cachedInput: 0.5, output: 30 },
  "gpt-5-mini": { input: 0.25, cachedInput: 0.025, output: 2 }
};

function ratesFor(model: string): TextRates {
  const exact = TEXT_RATES_PER_MILLION[model];
  if (exact) return exact;
  const prefix = Object.keys(TEXT_RATES_PER_MILLION).find((candidate) => model.startsWith(candidate));
  return prefix ? TEXT_RATES_PER_MILLION[prefix] : TEXT_RATES_PER_MILLION["gpt-5.6-sol"];
}

export function estimateTextCostBrl(
  model: string,
  usage: TextUsage | undefined,
  usdToBrl = 5.5
): number {
  const input = Math.max(0, usage?.input_tokens ?? 0);
  const output = Math.max(0, usage?.output_tokens ?? 0);
  const cached = Math.min(input, Math.max(0, usage?.input_tokens_details?.cached_tokens ?? 0));
  const uncached = input - cached;
  const rates = ratesFor(model);
  const longContext = input > 272_000;
  const inputMultiplier = longContext ? 2 : 1;
  const outputMultiplier = longContext ? 1.5 : 1;
  const usd =
    (uncached * rates.input * inputMultiplier +
      cached * rates.cachedInput * inputMultiplier +
      output * rates.output * outputMultiplier) /
    1_000_000;
  return usd * Math.max(0, usdToBrl);
}

export function responseCostBrl(
  body: unknown,
  requestModel = "gpt-5.6-sol",
  usdToBrl = 5.5
): number {
  if (!body || typeof body !== "object") return 0;
  const record = body as { model?: string; usage?: TextUsage; response?: { model?: string; usage?: TextUsage } };
  const response = record.response;
  return estimateTextCostBrl(
    response?.model ?? record.model ?? requestModel,
    response?.usage ?? record.usage,
    usdToBrl
  );
}
