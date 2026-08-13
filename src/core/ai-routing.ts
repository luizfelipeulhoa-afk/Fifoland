export type AiWorkload =
  | "conversation"
  | "voice"
  | "memory-extraction"
  | "proactive-check"
  | "deep-planning";

export type AiProvider = "local" | "openai" | "openrouter" | "groq" | "deepgram" | "fifones-api";

export interface AiRouteRequest {
  workload: AiWorkload;
  budgetRemainingBrl: number;
  demoMode: boolean;
  allowCloud: boolean;
  ownApiBaseUrl?: string;
  preferredTextModel?: string;
  preferredRealtimeModel?: string;
  hasOpenRouterKey?: boolean;
  hasGroqKey?: boolean;
  hasDeepgramKey?: boolean;
}

export interface AiRoute {
  provider: AiProvider;
  model: string;
  baseUrl?: string;
  reason: "demo" | "own-api" | "budget" | "realtime" | "quality" | "cost-saving";
}

const LOCAL_MODEL = "local-rules-and-memory";

export const DEEPSEEK_V3_MODEL = "deepseek/deepseek-chat";
export const DEEPSEEK_R1_MODEL = "deepseek/deepseek-r1";
export const GROQ_LLAMA_MODEL = "llama-3.3-70b-versatile";
export const DEEPGRAM_VOICE_MODEL = "nova-3";

export const ECONOMY_TEXT_MODEL = "gpt-5.6-luna";
export const BALANCED_TEXT_MODEL = "gpt-5.6-terra";

function cleanBaseUrl(value?: string): string | undefined {
  const trimmed = value?.trim().replace(/\/+$/, "");
  return trimmed || undefined;
}

function textModelFor(request: AiRouteRequest): string {
  const preferred = request.preferredTextModel?.trim();
  if (preferred && preferred !== "auto") return preferred;

  if (request.hasOpenRouterKey) {
    return request.workload === "deep-planning" ? DEEPSEEK_R1_MODEL : DEEPSEEK_V3_MODEL;
  }

  return request.workload === "deep-planning" ? BALANCED_TEXT_MODEL : ECONOMY_TEXT_MODEL;
}

export function chooseAiRoute(request: AiRouteRequest): AiRoute {
  const ownApiBaseUrl = cleanBaseUrl(request.ownApiBaseUrl);

  if (request.demoMode || !request.allowCloud) {
    return { provider: "local", model: LOCAL_MODEL, reason: "demo" };
  }

  if (ownApiBaseUrl) {
    return {
      provider: "fifones-api",
      model:
        request.workload === "voice"
          ? request.preferredRealtimeModel ?? "auto"
          : textModelFor(request),
      baseUrl: ownApiBaseUrl,
      reason: "own-api"
    };
  }

  if (request.workload === "voice") {
    if (request.hasDeepgramKey) {
      return {
        provider: "deepgram",
        model: DEEPGRAM_VOICE_MODEL,
        reason: "cost-saving"
      };
    }
    return {
      provider: "openai",
      model: request.preferredRealtimeModel ?? "auto",
      reason: "realtime"
    };
  }

  if (request.budgetRemainingBrl <= 0) {
    return { provider: "local", model: LOCAL_MODEL, reason: "budget" };
  }

  if (request.hasOpenRouterKey) {
    return {
      provider: "openrouter",
      model: textModelFor(request),
      baseUrl: "https://openrouter.ai/api/v1",
      reason: "cost-saving"
    };
  }

  if (request.hasGroqKey && request.workload === "memory-extraction") {
    return {
      provider: "groq",
      model: GROQ_LLAMA_MODEL,
      baseUrl: "https://api.groq.com/openai/v1",
      reason: "cost-saving"
    };
  }

  return {
    provider: "openai",
    model: textModelFor(request),
    reason: request.workload === "deep-planning" ? "quality" : "budget"
  };
}

export function aiEndpoint(baseUrl: string | undefined, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBase = cleanBaseUrl(baseUrl);
  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
}
