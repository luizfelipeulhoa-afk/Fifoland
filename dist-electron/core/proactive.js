"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findProactiveSignal = findProactiveSignal;
function findProactiveSignal(tasks, events, reference = new Date(), eventWindowMinutes = 30) {
    const now = reference.getTime();
    const overdue = tasks
        .filter((task) => task.status === "pending" && task.dueAt)
        .map((task) => ({ task, timestamp: Date.parse(task.dueAt) }))
        .filter((item) => Number.isFinite(item.timestamp) && item.timestamp < now)
        .sort((a, b) => a.timestamp - b.timestamp)[0];
    if (overdue) {
        return {
            kind: "overdue-task",
            fingerprint: `task:${overdue.task.id}:${overdue.task.updatedAt}`,
            title: "Fifones viu um ponto pendente",
            body: `A tarefa “${overdue.task.title}” passou do prazo. Quer reorganizar o próximo passo?`,
            view: "today"
        };
    }
    const windowEnd = now + eventWindowMinutes * 60_000;
    const upcoming = events
        .map((event) => ({ event, timestamp: Date.parse(event.start) }))
        .filter((item) => Number.isFinite(item.timestamp) &&
        item.timestamp >= now &&
        item.timestamp <= windowEnd)
        .sort((a, b) => a.timestamp - b.timestamp)[0];
    if (!upcoming)
        return undefined;
    const minutes = Math.max(1, Math.round((upcoming.timestamp - now) / 60_000));
    return {
        kind: "upcoming-event",
        fingerprint: `event:${upcoming.event.id}:${upcoming.event.updatedAt}`,
        title: "Fifones está te preparando",
        body: `“${upcoming.event.title}” começa em aproximadamente ${minutes} min.`,
        view: "calendar"
    };
}
