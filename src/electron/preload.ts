import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type {
  ChatMessage,
  ChatRequest,
  ContractInput,
  EcoApi,
  MemoryInput,
  MemoryStatus,
  PersonalCalendarEventInput,
  PersonInput,
  RealtimeUsage,
  RealtimeConnectRequest,
  Settings,
  TaskInput,
  TaskStatus
} from "../shared/types.js";

const api: EcoApi = {
  bootstrap: () => ipcRenderer.invoke("app:bootstrap"),
  lock: () => ipcRenderer.invoke("security:lock"),
  unlock: () => ipcRenderer.invoke("security:unlock"),
  setApiKey: (key: string) => ipcRenderer.invoke("api-key:set", key),
  clearApiKey: () => ipcRenderer.invoke("api-key:clear"),
  setFifonesApiToken: (token: string) => ipcRenderer.invoke("fifones-api-token:set", token),
  clearFifonesApiToken: () => ipcRenderer.invoke("fifones-api-token:clear"),
  testFifonesApi: () => ipcRenderer.invoke("fifones-api:test"),
  decideProactiveSignal: (fingerprint: string, decision: "accepted" | "dismissed" | "snoozed") => ipcRenderer.invoke("proactive:decision", fingerprint, decision),
  updateSettings: (patch: Partial<Settings>) =>
    ipcRenderer.invoke("settings:update", patch),
  listMemories: () => ipcRenderer.invoke("memories:list"),
  saveMemory: (input: MemoryInput) => ipcRenderer.invoke("memories:save", input),
  reviewMemory: (id: string, status: MemoryStatus) =>
    ipcRenderer.invoke("memories:review", id, status),
  deleteMemory: (id: string) => ipcRenderer.invoke("memories:delete", id),
  createContract: (input: ContractInput) =>
    ipcRenderer.invoke("contracts:create", input),
  stopContract: (id: string) => ipcRenderer.invoke("contracts:stop", id),
  deleteContract: (id: string) => ipcRenderer.invoke("contracts:delete", id),
  sendChat: (request: ChatRequest) => ipcRenderer.invoke("chat:send", request),
  transcribeAudio: (audio: ArrayBuffer, mimeType: string) =>
    ipcRenderer.invoke("audio:transcribe", audio, mimeType),
  getLocalTtsStatus: () => ipcRenderer.invoke("audio:local-tts-status"),
  synthesizeLocalSpeech: (text: string, voice: string) =>
    ipcRenderer.invoke("audio:local-tts", text, voice),
  connectRealtime: (request: RealtimeConnectRequest) =>
    ipcRenderer.invoke("realtime:connect", request),
  saveRealtimeMessage: (message: ChatMessage) =>
    ipcRenderer.invoke("chat:save-realtime-message", message),
  listTasks: () => ipcRenderer.invoke("tasks:list"),
  saveTask: (input: TaskInput) => ipcRenderer.invoke("tasks:save", input),
  updateTaskStatus: (id: string, status: TaskStatus) =>
    ipcRenderer.invoke("tasks:status", id, status),
  deleteTask: (id: string) => ipcRenderer.invoke("tasks:delete", id),
  listCalendarEvents: () => ipcRenderer.invoke("calendar:list"),
  saveCalendarEvent: (input: PersonalCalendarEventInput) =>
    ipcRenderer.invoke("calendar:save", input),
  deleteCalendarEvent: (id: string) => ipcRenderer.invoke("calendar:delete", id),
  proposeTaskFromText: (text: string, sourceMessageId?: string) =>
    ipcRenderer.invoke("tasks:propose-from-text", text, sourceMessageId),
  resolveProposal: (id: string, decision: "confirm" | "reject") =>
    ipcRenderer.invoke("proposals:resolve", id, decision),
  listPendingApprovals: () => ipcRenderer.invoke("actions:list-pending"),
  resolveActionApproval: (id: string, decision: "approve" | "reject") =>
    ipcRenderer.invoke("actions:resolve", id, decision),
  listAuditEvents: (limit?: number) => ipcRenderer.invoke("audit:list", limit),
  snoozeReminder: (id: string, minutes: number) =>
    ipcRenderer.invoke("reminders:snooze", id, minutes),
  cancelReminder: (id: string) => ipcRenderer.invoke("reminders:cancel", id),
  listPeople: () => ipcRenderer.invoke("people:list"),
  savePerson: (input: PersonInput) => ipcRenderer.invoke("people:save", input),
  deletePerson: (id: string) => ipcRenderer.invoke("people:delete", id),
  recordRealtimeUsage: (usage: RealtimeUsage) =>
    ipcRenderer.invoke("usage:record-realtime", usage),
  setBudgetOverride: (enabled: boolean) =>
    ipcRenderer.invoke("usage:override", enabled),
  toggleCompactMode: () => ipcRenderer.invoke("window:toggle-compact"),
  toggleAuraOnly: () => ipcRenderer.invoke("window:toggle-aura-only"),
  onCompactMode: (listener: (compact: boolean) => void) => {
    const handler = (_event: IpcRendererEvent, compact: boolean) =>
      listener(compact);
    ipcRenderer.on("window:compact-mode", handler);
    return () => ipcRenderer.removeListener("window:compact-mode", handler);
  },
  onAuraOnly: (listener: (auraOnly: boolean) => void) => {
    const handler = (_event: IpcRendererEvent, auraOnly: boolean) =>
      listener(auraOnly);
    ipcRenderer.on("window:aura-only", handler);
    return () => ipcRenderer.removeListener("window:aura-only", handler);
  },
  onNavigate: (listener: (view: string) => void) => {
    const handler = (_event: IpcRendererEvent, view: string) => listener(view);
    ipcRenderer.on("app:navigate", handler);
    return () => ipcRenderer.removeListener("app:navigate", handler);
  },
  connectGoogleCalendar: () => ipcRenderer.invoke("calendar:google-connect"),
  disconnectGoogleCalendar: () => ipcRenderer.invoke("calendar:google-disconnect"),
  listGoogleCalendarEvents: () => ipcRenderer.invoke("calendar:google-list"),
  exportData: () => ipcRenderer.invoke("data:export"),
  deleteAllData: () => ipcRenderer.invoke("data:delete-all"),
  takeScreenshot: () => ipcRenderer.invoke("vision:take-screenshot"),
  summonWindow: () => ipcRenderer.invoke("window:summon")
};

contextBridge.exposeInMainWorld("eco", api);
