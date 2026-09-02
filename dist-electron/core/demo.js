"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoAdvisorResponse = demoAdvisorResponse;
function demoAdvisorResponse(args) {
    if (/^\s*(oi+(e+)?|ol[aá]|bom dia|boa tarde|boa noite|e a[ií])\s*[!,.?]*\s*$/i.test(args.text)) {
        return [
            "### O que parece estar acontecendo",
            "Você está abrindo a conversa — e eu ainda estou formando um mapa fiel de quem você é.",
            "",
            "### O melhor contraponto",
            "Eu não vou presumir que “melhorar” significa produzir mais ou seguir um modelo pronto. Sua melhor versão precisa nascer dos seus valores.",
            "",
            "### Evidências e incertezas",
            "Ainda não tenho memórias confirmadas suficientes para personalizar esta conversa.",
            "",
            "### A decisão continua sua",
            "O que você mais quer entender ou desenvolver em si mesmo neste momento?"
        ].join("\n");
    }
    if (args.highRisk) {
        return [
            "### O que parece estar acontecendo",
            "Este assunto pode ter consequências importantes, então desativei qualquer tentativa de persuasão.",
            "",
            "### O melhor contraponto",
            "Antes de agir, vale separar o que você sabe, o que está supondo e o que precisa ser validado com uma pessoa qualificada.",
            "",
            "### Evidências e incertezas",
            "O modo demonstração não avalia fatos médicos, jurídicos, financeiros ou situações de crise. Procure apoio profissional ou alguém de confiança; em risco imediato, contate o serviço de emergência local.",
            "",
            "### A decisão continua sua",
            "Posso ajudar a preparar perguntas e organizar as informações para essa conversa."
        ].join("\n");
    }
    if (args.contractRequired) {
        return [
            "### O que parece estar acontecendo",
            "Você pediu persuasão, mas ainda não existe um contrato ativo.",
            "",
            "### O melhor contraponto",
            "Definir objetivo, limites e uma condição de parada protege sua autonomia antes de eu pressionar qualquer direção.",
            "",
            "### Evidências e incertezas",
            "Sem esse acordo, permaneci no modo contraditório.",
            "",
            "### A decisão continua sua",
            "Abra “Contratos”, registre o objetivo e volte quando quiser."
        ].join("\n");
    }
    const memoryLine = args.memories.length > 0
        ? `Há ${args.memories.length} memória(s) relacionada(s), especialmente “${args.memories[0].title}” [M1].`
        : "Ainda não encontrei memórias confirmadas suficientes para afirmar como você costuma decidir.";
    const modeLine = {
        reflection: "Minha leitura é que vale desacelerar e nomear o conflito central antes de escolher.",
        simulation: "A simulação mais honesta é provisória: seu padrão passado pode informar, mas não deve aprisionar quem você quer se tornar.",
        counterpoint: "O argumento mais forte contra sua posição é que você pode estar valorizando a coerência imediata mais do que a evidência nova.",
        persuasion: `O contrato “${args.contract?.objective ?? "ativo"}” me autoriza a lembrá-lo do motivo que você escolheu, sem ultrapassar seus limites.`
    };
    return [
        "### O que parece estar acontecendo",
        `${modeLine[args.mode]} ${memoryLine}`,
        "",
        "### O melhor contraponto",
        "Que evidência faria você mudar de ideia? Se a resposta for “nenhuma”, talvez isto seja proteção de identidade, não uma decisão em aberto.",
        "",
        "### Evidências e incertezas",
        "Esta resposta foi gerada localmente no modo demonstração. Configure a API para uma análise profunda; nenhuma lembrança nova foi presumida.",
        "",
        "### A decisão continua sua",
        `Dê um próximo passo pequeno e reversível sobre “${args.text.slice(0, 80)}${args.text.length > 80 ? "…" : ""}”, depois reavalie com dados reais.`
    ].join("\n");
}
