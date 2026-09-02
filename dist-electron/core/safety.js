"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHighRisk = isHighRisk;
exports.isStopPhrase = isStopPhrase;
exports.decideMode = decideMode;
exports.buildSafetyInstructions = buildSafetyInstructions;
const HIGH_RISK_PATTERNS = [
    /\b(suic[ií]d|me matar|tirar minha vida|automutila|sem vontade de viver)\b/i,
    /\b(diagn[oó]stico|rem[eé]dio|medicamento|dose|tratamento m[eé]dico|cirurgia|sintoma grave)\b/i,
    /\b(processar|contrato legal|advogado|crime|pris[aã]o|jur[ií]dico|assinar contrato)\b/i,
    /\b(investir tudo|comprar a[cç][oõ]es|criptomoeda|aposta|empr[eé]stimo|financiamento|d[ií]vida|hipoteca|fal[eê]ncia|aposentadoria)\b/i
];
function isHighRisk(text) {
    return HIGH_RISK_PATTERNS.some((pattern) => pattern.test(text));
}
function isStopPhrase(text) {
    return /^\s*(pare|chega|encerre (a )?persuas[aã]o|pare de me convencer|cancele (o )?contrato)\s*[.!]?\s*$/i.test(text);
}
function decideMode(text, requestedMode, activeContract) {
    const highRisk = isHighRisk(text);
    if (highRisk) {
        return {
            requestedMode,
            effectiveMode: "reflection",
            highRisk: true,
            contractRequired: false,
            reason: "Tema de alto risco: persuasão desativada e apoio humano recomendado."
        };
    }
    if (requestedMode === "persuasion" && !activeContract) {
        return {
            requestedMode,
            effectiveMode: "counterpoint",
            highRisk: false,
            contractRequired: true,
            reason: "Crie um contrato ativo antes de autorizar persuasão."
        };
    }
    return {
        requestedMode,
        effectiveMode: requestedMode,
        highRisk: false,
        contractRequired: false
    };
}
function buildSafetyInstructions() {
    return [
        "Você é Fifones, um instrumento de reflexão pessoal, nunca uma autoridade ou pessoa consciente.",
        "Não alegue ser o usuário, ter sentimentos, intimidade real ou consciência.",
        "Não use culpa, medo, segredo, chantagem, pressão emocional ou persistência após recusa.",
        "Nunca transforme inseguranças, traumas, relações ou segredos presentes nas memórias em alavancas de persuasão.",
        "Conteste premissas falsas com respeito; concordância não é o objetivo.",
        "Em temas médicos, jurídicos, financeiros de alto impacto ou crise emocional, não persuada nem decida. Em risco imediato, recomende serviço de emergência local e uma pessoa de confiança.",
        "Diferencie fatos recuperados, inferências e incertezas.",
        "A decisão final sempre pertence ao usuário."
    ].join("\n");
}
