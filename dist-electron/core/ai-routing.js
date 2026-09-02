"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BALANCED_TEXT_MODEL = exports.ECONOMY_TEXT_MODEL = exports.DEEPGRAM_VOICE_MODEL = exports.GROQ_LLAMA_MODEL = exports.DEEPSEEK_R1_MODEL = exports.DEEPSEEK_V3_MODEL = void 0;
exports.chooseAiRoute = chooseAiRoute;
exports.aiEndpoint = aiEndpoint;
const LOCAL_MODEL = "local-rules-and-memory";
exports.DEEPSEEK_V3_MODEL = "deepseek/deepseek-chat";
exports.DEEPSEEK_R1_MODEL = "deepseek/deepseek-r1";
exports.GROQ_LLAMA_MODEL = "llama-3.3-70b-versatile";
exports.DEEPGRAM_VOICE_MODEL = "nova-3";
exports.ECONOMY_TEXT_MODEL = "gpt-5.6-luna";
exports.BALANCED_TEXT_MODEL = "gpt-5.6-terra";
function cleanBaseUrl(value) {
    const trimmed = value?.trim().replace(/\/+$/, "");
    return trimmed || undefined;
}
function textModelFor(request) {
    const preferred = request.preferredTextModel?.trim();
    if (preferred && preferred !== "auto")
        return preferred;
    if (request.hasOpenRouterKey) {
        return request.workload === "deep-planning" ? exports.DEEPSEEK_R1_MODEL : exports.DEEPSEEK_V3_MODEL;
    }
    return request.workload === "deep-planning" ? exports.BALANCED_TEXT_MODEL : exports.ECONOMY_TEXT_MODEL;
}
function chooseAiRoute(request) {
    const ownApiBaseUrl = cleanBaseUrl(request.ownApiBaseUrl);
    if (request.demoMode || !request.allowCloud) {
        return { provider: "local", model: LOCAL_MODEL, reason: "demo" };
    }
    if (ownApiBaseUrl) {
        return {
            provider: "fifones-api",
            model: request.workload === "voice"
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
                model: exports.DEEPGRAM_VOICE_MODEL,
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
            model: exports.GROQ_LLAMA_MODEL,
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
function aiEndpoint(baseUrl, path) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const normalizedBase = cleanBaseUrl(baseUrl);
    return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
}
