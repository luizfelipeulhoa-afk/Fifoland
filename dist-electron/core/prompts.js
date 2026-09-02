"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAdvisorPrompt = buildAdvisorPrompt;
const purpose_js_1 = require("./purpose.js");
const safety_js_1 = require("./safety.js");
const identity_js_1 = require("./identity.js");
const MODE_INSTRUCTIONS = {
    reflection: "Modo REFLEXÃO: organize o pensamento do usuário e faça uma pergunta útil e direta. Não tente mudar a decisão.",
    simulation: "Modo SIMULAÇÃO: estime de forma curta e objetiva como o usuário pensaria usando apenas memórias citadas.",
    counterpoint: "Modo CONTRADITÓRIO: apresente a melhor objeção de forma cirúrgica e rete as suposições. Papo reto.",
    persuasion: "Modo PERSUASÃO AUTORIZADA: argumente a favor do objetivo do contrato, sendo muito direto e usando a intensidade definida."
};
function buildAdvisorPrompt(args) {
    const memoryContext = args.memories.length === 0
        ? "Nenhuma memória relevante confirmada foi encontrada."
        : args.memories
            .map((memory, index) => `[M${index + 1}|${memory.id}] ${memory.category.toUpperCase()} — ${memory.title}: ${memory.content} (fonte: ${memory.source}; confiança: ${Math.round(memory.confidence * 100)}%)`)
            .join("\n");
    const contractContext = args.contract
        ? [
            `Objetivo: ${args.contract.objective}`,
            `Motivo: ${args.contract.reason}`,
            `Limites: ${args.contract.limits}`,
            `Intensidade: ${args.contract.intensity}/3`,
            `Parar quando: ${args.contract.stopCondition}`
        ].join("\n")
        : "Nenhum contrato ativo.";
    const recentConversation = args.recentMessages?.length
        ? args.recentMessages
            .slice(-10)
            .map((message) => `${message.role === "user" ? "Fifo" : "Fifones"}: ${message.content.slice(0, 1200)}`)
            .join("\n")
        : "Nenhuma conversa recente foi incluída.";
    const responseFormat = args.voice
        ? [
            "REGRA ABSOLUTA PARA VOZ: Responda em uma ou duas frases no máximo. Nunca dê explicações longas a menos que solicitado.",
            "Converse de forma natural, como um humano em uma ligação. Não leia itens de lista e evite qualquer formatação textual.",
            "Vá direto ao ponto. Sem introduções amigáveis enroladas.",
            "Se não tiver o que acrescentar, apenas confirme que entendeu ou faça uma pergunta curta."
        ]
        : [
            "REGRA ABSOLUTA PARA TEXTO: Responda de forma curta, direta e sem contar 'historinhas'. Vá direto ao ponto.",
            "Use parágrafos curtos. Não use jargões motivacionais ou formato engessado, a não ser que ajude a explicar algo complexo.",
            "Só aprofunde ou forneça detalhes extensos se o usuário solicitar explicitamente.",
            "A decisão é sempre do usuário."
        ];
    return [
        (0, purpose_js_1.buildPurposeInstructions)(),
        "",
        (0, safety_js_1.buildSafetyInstructions)(),
        "",
        (0, identity_js_1.buildFifonesIdentityInstructions)(),
        "",
        MODE_INSTRUCTIONS[args.mode],
        args.highRisk
            ? "ALTO RISCO DETECTADO: limite-se a organizar fatos e indicar apoio."
            : "",
        "",
        "MEMÓRIAS RECUPERADAS:",
        memoryContext,
        "",
        "CONTRATO:",
        contractContext,
        "",
        "CONVERSA RECENTE:",
        recentConversation,
        "",
        "Responda em português brasileiro, tom informal, caloroso e papo reto. Sem bajulação e sem enrolação.",
        ...responseFormat,
        "Ao usar uma memória, cite [M1], [M2]. Não invente dados."
    ]
        .filter(Boolean)
        .join("\n");
}
