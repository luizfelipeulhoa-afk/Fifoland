"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveLocalVoiceCommand = resolveLocalVoiceCommand;
function resolveLocalVoiceCommand(rawText, context) {
    const text = rawText.trim().toLocaleLowerCase("pt-BR");
    const english = context.language === "en-US" || /\b(what|time|today|tasks|date)\b/i.test(text);
    const locale = english ? "en-US" : "pt-BR";
    if (/\b(que horas|qual a hora|what time|current time)\b/i.test(text)) {
        const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(context.now);
        return english ? `It is ${time}.` : `Agora sao ${time}.`;
    }
    if (/\b(que dia|qual a data|what date|what day)\b/i.test(text)) {
        const date = new Intl.DateTimeFormat(locale, {
            weekday: "long",
            day: "numeric",
            month: "long"
        }).format(context.now);
        return english ? `Today is ${date}.` : `Hoje e ${date}.`;
    }
    if (/\b(minhas tarefas|tarefas de hoje|pending tasks|my tasks|tasks today)\b/i.test(text)) {
        const pending = context.tasks.filter((task) => task.status === "pending").slice(0, 4);
        if (!pending.length)
            return english ? "You have no pending tasks." : "Voce nao tem tarefas pendentes.";
        const names = pending.map((task) => task.title).join("; ");
        return english ? `Your next tasks are: ${names}.` : `Suas proximas tarefas sao: ${names}.`;
    }
    if (/\b(proximo evento|minha agenda|next event|my schedule)\b/i.test(text)) {
        const next = context.events
            .filter((event) => new Date(event.start).getTime() >= context.now.getTime())
            .sort((a, b) => a.start.localeCompare(b.start))[0];
        if (!next)
            return english ? "There are no upcoming local events." : "Nao ha eventos locais proximos.";
        const when = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(next.start));
        return english ? `Your next event is ${next.title}, at ${when}.` : `Seu proximo evento e ${next.title}, em ${when}.`;
    }
    return null;
}
