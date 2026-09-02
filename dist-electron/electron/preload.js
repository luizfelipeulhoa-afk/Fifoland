"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const api = {
    bootstrap: () => electron_1.ipcRenderer.invoke("app:bootstrap"),
    lock: () => electron_1.ipcRenderer.invoke("security:lock"),
    unlock: () => electron_1.ipcRenderer.invoke("security:unlock"),
    setApiKey: (key) => electron_1.ipcRenderer.invoke("api-key:set", key),
    clearApiKey: () => electron_1.ipcRenderer.invoke("api-key:clear"),
    setFifonesApiToken: (token) => electron_1.ipcRenderer.invoke("fifones-api-token:set", token),
    clearFifonesApiToken: () => electron_1.ipcRenderer.invoke("fifones-api-token:clear"),
    testFifonesApi: () => electron_1.ipcRenderer.invoke("fifones-api:test"),
    decideProactiveSignal: (fingerprint, decision) => electron_1.ipcRenderer.invoke("proactive:decision", fingerprint, decision),
    updateSettings: (patch) => electron_1.ipcRenderer.invoke("settings:update", patch),
    listMemories: () => electron_1.ipcRenderer.invoke("memories:list"),
    saveMemory: (input) => electron_1.ipcRenderer.invoke("memories:save", input),
    reviewMemory: (id, status) => electron_1.ipcRenderer.invoke("memories:review", id, status),
    deleteMemory: (id) => electron_1.ipcRenderer.invoke("memories:delete", id),
    createContract: (input) => electron_1.ipcRenderer.invoke("contracts:create", input),
    stopContract: (id) => electron_1.ipcRenderer.invoke("contracts:stop", id),
    deleteContract: (id) => electron_1.ipcRenderer.invoke("contracts:delete", id),
    sendChat: (request) => electron_1.ipcRenderer.invoke("chat:send", request),
    transcribeAudio: (audio, mimeType) => electron_1.ipcRenderer.invoke("audio:transcribe", audio, mimeType),
    getLocalTtsStatus: () => electron_1.ipcRenderer.invoke("audio:local-tts-status"),
    synthesizeLocalSpeech: (text, voice) => electron_1.ipcRenderer.invoke("audio:local-tts", text, voice),
    connectRealtime: (request) => electron_1.ipcRenderer.invoke("realtime:connect", request),
    saveRealtimeMessage: (message) => electron_1.ipcRenderer.invoke("chat:save-realtime-message", message),
    listTasks: () => electron_1.ipcRenderer.invoke("tasks:list"),
    saveTask: (input) => electron_1.ipcRenderer.invoke("tasks:save", input),
    updateTaskStatus: (id, status) => electron_1.ipcRenderer.invoke("tasks:status", id, status),
    deleteTask: (id) => electron_1.ipcRenderer.invoke("tasks:delete", id),
    listCalendarEvents: () => electron_1.ipcRenderer.invoke("calendar:list"),
    saveCalendarEvent: (input) => electron_1.ipcRenderer.invoke("calendar:save", input),
    deleteCalendarEvent: (id) => electron_1.ipcRenderer.invoke("calendar:delete", id),
    proposeTaskFromText: (text, sourceMessageId) => electron_1.ipcRenderer.invoke("tasks:propose-from-text", text, sourceMessageId),
    resolveProposal: (id, decision) => electron_1.ipcRenderer.invoke("proposals:resolve", id, decision),
    listPendingApprovals: () => electron_1.ipcRenderer.invoke("actions:list-pending"),
    resolveActionApproval: (id, decision) => electron_1.ipcRenderer.invoke("actions:resolve", id, decision),
    listAuditEvents: (limit) => electron_1.ipcRenderer.invoke("audit:list", limit),
    snoozeReminder: (id, minutes) => electron_1.ipcRenderer.invoke("reminders:snooze", id, minutes),
    cancelReminder: (id) => electron_1.ipcRenderer.invoke("reminders:cancel", id),
    listPeople: () => electron_1.ipcRenderer.invoke("people:list"),
    savePerson: (input) => electron_1.ipcRenderer.invoke("people:save", input),
    deletePerson: (id) => electron_1.ipcRenderer.invoke("people:delete", id),
    recordRealtimeUsage: (usage) => electron_1.ipcRenderer.invoke("usage:record-realtime", usage),
    setBudgetOverride: (enabled) => electron_1.ipcRenderer.invoke("usage:override", enabled),
    toggleCompactMode: () => electron_1.ipcRenderer.invoke("window:toggle-compact"),
    toggleAuraOnly: () => electron_1.ipcRenderer.invoke("window:toggle-aura-only"),
    onCompactMode: (listener) => {
        const handler = (_event, compact) => listener(compact);
        electron_1.ipcRenderer.on("window:compact-mode", handler);
        return () => electron_1.ipcRenderer.removeListener("window:compact-mode", handler);
    },
    onAuraOnly: (listener) => {
        const handler = (_event, auraOnly) => listener(auraOnly);
        electron_1.ipcRenderer.on("window:aura-only", handler);
        return () => electron_1.ipcRenderer.removeListener("window:aura-only", handler);
    },
    onNavigate: (listener) => {
        const handler = (_event, view) => listener(view);
        electron_1.ipcRenderer.on("app:navigate", handler);
        return () => electron_1.ipcRenderer.removeListener("app:navigate", handler);
    },
    connectGoogleCalendar: () => electron_1.ipcRenderer.invoke("calendar:google-connect"),
    disconnectGoogleCalendar: () => electron_1.ipcRenderer.invoke("calendar:google-disconnect"),
    listGoogleCalendarEvents: () => electron_1.ipcRenderer.invoke("calendar:google-list"),
    exportData: () => electron_1.ipcRenderer.invoke("data:export"),
    deleteAllData: () => electron_1.ipcRenderer.invoke("data:delete-all"),
    takeScreenshot: () => electron_1.ipcRenderer.invoke("vision:take-screenshot"),
    summonWindow: () => electron_1.ipcRenderer.invoke("window:summon")
};
electron_1.contextBridge.exposeInMainWorld("eco", api);
