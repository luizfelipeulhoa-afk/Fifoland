"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReasonedResponse = createReasonedResponse;
exports.createRealtimeCall = createRealtimeCall;
exports.transcribeAudio = transcribeAudio;
exports.deriveSafetyIdentifier = deriveSafetyIdentifier;
const node_crypto_1 = require("node:crypto");
const prompts_js_1 = require("../core/prompts.js");
const usage_js_1 = require("../core/usage.js");
const ai_routing_js_1 = require("../core/ai-routing.js");
function extractOutputText(response) {
    if (!response || typeof response !== "object")
        return "";
    const record = response;
    const tc = record.tool_calls?.[0]?.function || record.choices?.[0]?.message?.tool_calls?.[0]?.function;
    if (tc) {
        return `[AÇÃO AUTÔNOMA SOLICITADA] ⚙️\n**Ação:** \`${tc.name}\`\n**Alvo:** \`${tc.arguments}\`\n\n> *Aguardando aprovação no Muro de Governança para rodar no seu Windows.*`;
    }
    if (record.output_text)
        return record.output_text;
    return (record.output
        ?.flatMap((item) => item.content ?? [])
        .filter((content) => content.type === "output_text")
        .map((content) => content.text ?? "")
        .join("\n") ?? "");
}
async function apiError(response) {
    const body = await response.text();
    try {
        const parsed = JSON.parse(body);
        return new Error(parsed.error?.message ?? `OpenAI respondeu ${response.status}.`);
    }
    catch {
        return new Error(`OpenAI respondeu ${response.status}: ${body.slice(0, 240)}`);
    }
}
async function createReasonedResponse(args) {
    const voiceInstruction = args.voiceReply
        ? `\nEsta resposta sera falada em voz alta. Responda em no maximo ${args.settings.voiceReplyMaxSentences} frases curtas, sem Markdown. ${args.language === "en-US"
            ? "Answer in English."
            : args.language === "pt-BR"
                ? "Responda em portugues brasileiro."
                : "Responda no mesmo idioma usado pela pessoa."}`
        : "";
    const response = await fetch((0, ai_routing_js_1.aiEndpoint)(args.apiBaseUrl ?? "https://api.openai.com", "/v1/responses"), {
        method: "POST",
        headers: {
            Authorization: `Bearer ${args.apiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Safety-Identifier": args.safetyIdentifier
        },
        body: JSON.stringify({
            model: args.model ?? args.settings.reasoningModel,
            store: false,
            reasoning: { effort: args.voiceReply ? "low" : "medium" },
            text: { verbosity: args.voiceReply ? "low" : "medium" },
            instructions: (0, prompts_js_1.buildAdvisorPrompt)({
                mode: args.mode,
                memories: args.memories,
                contract: args.contract,
                highRisk: args.highRisk,
                recentMessages: args.recentMessages
            }) + voiceInstruction + "\n\nREGRA MÁXIMA DE AUTONOMIA: Você TEM acesso ao computador local do usuário e permissão total. Se ele pedir para abrir o VS Code, terminal, pastas ou executar algo, você DEVE OBRIGATORIAMENTE usar a ferramenta `executar_comando_local`. Nunca diga que não tem permissão ou que não consegue.",
            input: args.text,
            tools: [{
                    type: "function",
                    function: {
                        name: "executar_comando_local",
                        description: "Abre o VS Code, gerencia pastas ou executa scripts no Windows do usuário.",
                        parameters: {
                            type: "object",
                            properties: {
                                comando: { type: "string", enum: ["abrir_vscode", "abrir_terminal", "criar_arquivo"] },
                                alvo: { type: "string", description: "O caminho ou nome do projeto/arquivo" }
                            },
                            required: ["comando", "alvo"]
                        }
                    }
                }]
        })
    });
    if (!response.ok)
        throw await apiError(response);
    const body = (await response.json());
    const content = extractOutputText(body);
    if (!content)
        throw new Error("A API não retornou texto.");
    return {
        message: {
            id: (0, node_crypto_1.randomUUID)(),
            role: "assistant",
            content,
            createdAt: new Date().toISOString(),
            mode: args.mode,
            highRisk: args.highRisk,
            citations: args.memories.map((memory) => ({
                id: memory.id,
                title: memory.title,
                source: memory.source,
                confidence: memory.confidence
            }))
        },
        estimatedCostBrl: (0, usage_js_1.estimateReasoningCostBrl)(body.usage?.input_tokens ?? 0, body.usage?.output_tokens ?? 0, args.model ?? args.settings.reasoningModel, body.usage?.input_tokens_details?.cached_tokens ?? 0)
    };
}
async function createRealtimeCall(args) {
    const form = new FormData();
    form.set("sdp", args.sdp);
    form.set("session", JSON.stringify({
        type: "realtime",
        model: args.settings.realtimeModel,
        output_modalities: ["audio"],
        audio: {
            input: {
                turn_detection: {
                    type: "semantic_vad",
                    create_response: true,
                    interrupt_response: true
                },
                transcription: { model: "gpt-realtime-whisper" }
            },
            output: { voice: args.settings.voice }
        },
        instructions: args.instructions ??
            (0, prompts_js_1.buildAdvisorPrompt)({
                mode: args.mode,
                memories: args.memories,
                contract: args.contract,
                highRisk: args.highRisk,
                voice: true,
                recentMessages: args.recentMessages
            }) +
                "\nENTREGA DE VOZ: fale em portugues brasileiro neutro, com presenca madura, ritmo calmo e firme. Nao imite sotaque carioca nem use voz adolescente ou caricata."
    }));
    const response = await fetch((0, ai_routing_js_1.aiEndpoint)(args.apiBaseUrl ?? "https://api.openai.com", "/v1/realtime/calls"), {
        method: "POST",
        headers: {
            Authorization: `Bearer ${args.apiKey}`,
            "OpenAI-Safety-Identifier": args.safetyIdentifier
        },
        body: form
    });
    if (!response.ok)
        throw await apiError(response);
    return response.text();
}
async function transcribeAudio(args) {
    const form = new FormData();
    form.set("model", args.model ?? "gpt-4o-mini-transcribe");
    if (args.language && args.language !== "auto") {
        form.set("language", args.language === "pt-BR" ? "pt" : "en");
    }
    form.set("file", new Blob([args.audio], { type: args.mimeType || "audio/webm" }), "entrevista.webm");
    const response = await fetch((0, ai_routing_js_1.aiEndpoint)(args.apiBaseUrl ?? "https://api.openai.com", "/v1/audio/transcriptions"), {
        method: "POST",
        headers: {
            Authorization: `Bearer ${args.apiKey}`,
            "OpenAI-Safety-Identifier": args.safetyIdentifier
        },
        body: form
    });
    if (!response.ok)
        throw await apiError(response);
    const body = (await response.json());
    if (!body.text)
        throw new Error("A transcrição não retornou texto.");
    return body.text;
}
function deriveSafetyIdentifier(key) {
    return (0, node_crypto_1.createHash)("sha256").update(key).digest("hex").slice(0, 32);
}
