export type MemoryCategory =
  | "fact"
  | "experience"
  | "value"
  | "goal"
  | "preference"
  | "decision_pattern"
  | "commitment"
  | "contradiction";

export type MemoryStatus = "candidate" | "confirmed" | "rejected";
export type Sensitivity = "normal" | "sensitive" | "restricted";
export type AdviceMode = "reflection" | "simulation" | "counterpoint" | "persuasion";
export type TaskStatus = "pending" | "completed" | "cancelled";
export type TaskPriority = "low" | "normal" | "high";
export type ProposalStatus = "pending" | "confirmed" | "rejected";
export type VoiceProfile = "economy" | "quality";
export type VoiceLanguage = "auto" | "pt-BR" | "en-US";
export type SkillRisk = "local" | "draft" | "external-write" | "high-impact";
export type ActionApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "consumed";
export type AuditDecision =
  | "proposed"
  | "allowed"
  | "approved"
  | "rejected"
  | "expired"
  | "executed"
  | "failed";

export interface MemoryRecord {
  id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  source: string;
  sourceDetail?: string;
  confidence: number;
  sensitivity: Sensitivity;
  status: MemoryStatus;
  createdAt: string;
  updatedAt: string;
  revision: number;
  memoryKind?: "fact" | "episode" | "temporary";
  expiresAt?: string;
  reason?: string;
}

export interface MemoryInput {
  id?: string;
  category: MemoryCategory;
  title: string;
  content: string;
  source: string;
  sourceDetail?: string;
  confidence: number;
  sensitivity: Sensitivity;
  status: MemoryStatus;
  memoryKind?: "fact" | "episode" | "temporary";
  expiresAt?: string;
  reason?: string;
}

export interface PersuasionContract {
  id: string;
  objective: string;
  reason: string;
  deadline?: string;
  limits: string;
  intensity: 1 | 2 | 3;
  stopCondition: string;
  status: "active" | "stopped" | "completed";
  createdAt: string;
  stoppedAt?: string;
}

export interface ContractInput {
  objective: string;
  reason: string;
  deadline?: string;
  limits: string;
  intensity: 1 | 2 | 3;
  stopCondition: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  mode?: AdviceMode;
  citations?: MemoryCitation[];
  highRisk?: boolean;
}

export interface TaskDraft {
  title: string;
  dueAt?: string;
  priority: TaskPriority;
  recurrence?: string;
  goalId?: string;
  reminderAt?: string;
}

export interface TaskRecord extends TaskDraft {
  id: string;
  status: TaskStatus;
  sourceMessageId?: string;
  sourceText?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ReminderRecord {
  id: string;
  taskId: string;
  notifyAt: string;
  status: "scheduled" | "shown" | "snoozed" | "completed" | "cancelled";
  snoozedUntil?: string;
  followupCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActionProposal {
  id: string;
  type: "create_task" | "create_event";
  status: ProposalStatus;
  payload: TaskDraft;
  sourceText: string;
  sourceMessageId?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ActionApproval {
  id: string;
  actionType: string;
  risk: SkillRisk;
  status: ActionApprovalStatus;
  payloadHash: string;
  preview: string;
  resourceId?: string;
  createdAt: string;
  expiresAt: string;
  resolvedAt?: string;
  consumedAt?: string;
}

export interface AuditEvent {
  id: string;
  actionType: string;
  risk: SkillRisk;
  decision: AuditDecision;
  summary: string;
  payloadHash?: string;
  createdAt: string;
}

export interface SkillPermission {
  id: string;
  label: string;
  access: "read" | "draft" | "write";
}

export interface SkillManifest {
  id: string;
  name: string;
  description: string;
  risk: SkillRisk;
  permissions: SkillPermission[];
  enabled: boolean;
  estimatedCost: "free" | "low" | "variable";
  requiresConfirmation: boolean;
}

export interface PersonRecord {
  id: string;
  name: string;
  relationship: string;
  context: string;
  confirmedFacts: string;
  openLoops: string;
  sourceMemoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UsageBudget {
  month: string;
  estimatedBrl: number;
  limitBrl: number;
  percentUsed: number;
  blocked: boolean;
}

export interface CalendarEventRecord {
  id: string;
  title: string;
  start: string;
  end?: string;
  location?: string;
  htmlLink?: string;
}

export interface PersonalCalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  notes?: string;
  color: "coral" | "violet" | "blue" | "green";
  createdAt: string;
  updatedAt: string;
}

export interface PersonalCalendarEventInput {
  id?: string;
  title: string;
  start: string;
  end?: string;
  notes?: string;
  color?: PersonalCalendarEvent["color"];
}

export interface GamificationSummary {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  completedToday: number;
}

export interface MemoryCitation {
  id: string;
  title: string;
  source: string;
  confidence?: number;
}

export interface Settings {
  name: string;
  reasoningModel: string;
  realtimeModel: string;
  voice: string;
  autoLockMinutes: number;
  demoMode: boolean;
  wakePhraseEnabled: boolean;
  voiceProfile: VoiceProfile;
  voiceLanguage: VoiceLanguage;
  localVoiceUri: string;
  localVoiceProvider: "windows" | "kokoro";
  kokoroVoice: string;
  economyVoiceEnabled: boolean;
  economyVoiceMaxSeconds: number;
  voiceReplyMaxSentences: number;
  monthlyBudgetBrl: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  proactiveEnabled: boolean;
  maxFollowups: number;
  globalShortcut: string;
  launchAtLogin: boolean;
  compactAlwaysOnTop: boolean;
  googleCalendarClientId: string;
  aiApiBaseUrl: string;
}

export interface AppStats {
  confirmed: number;
  candidates: number;
  values: number;
  goals: number;
  activeContract: boolean;
  pendingTasks: number;
}

export interface BootstrapData {
  settings: Settings;
  stats: AppStats;
  memories: MemoryRecord[];
  contracts: PersuasionContract[];
  messages: ChatMessage[];
  tasks: TaskRecord[];
  calendarEvents: PersonalCalendarEvent[];
  gamification: GamificationSummary;
  reminders: ReminderRecord[];
  proposals: ActionProposal[];
  pendingApprovals: ActionApproval[];
  auditEvents: AuditEvent[];
  skills: SkillManifest[];
  people: PersonRecord[];
  usageBudget: UsageBudget;
  googleCalendarConnected: boolean;
  hasApiKey: boolean;
  hasOwnApiToken: boolean;
  encryptionAvailable: boolean;
}

export interface ChatRequest {
  text: string;
  mode: AdviceMode;
  voiceReply?: boolean;
  language?: VoiceLanguage;
}

export interface ChatResponse {
  message: ChatMessage;
  usedMemoryIds: string[];
  demo: boolean;
}

export interface RealtimeConnectRequest {
  sdp: string;
  mode: AdviceMode;
  experience?: "advisor" | "interview";
  interviewModuleId?: string;
}

export interface TaskInput extends TaskDraft {
  sourceMessageId?: string;
  sourceText?: string;
}

export interface PersonInput {
  id?: string;
  name: string;
  relationship: string;
  context: string;
  confirmedFacts: string;
  openLoops: string;
  sourceMemoryIds?: string[];
}

export interface RealtimeUsage {
  inputTextTokens?: number;
  outputTextTokens?: number;
  inputAudioTokens?: number;
  outputAudioTokens?: number;
}

export interface InterviewModule {
  id: string;
  title: string;
  subtitle: string;
  category: MemoryCategory;
  questions: string[];
}

export interface ExportBundle {
  exportedAt: string;
  schemaVersion: number;
  memories: MemoryRecord[];
  contracts: PersuasionContract[];
  messages: ChatMessage[];
  tasks: TaskRecord[];
  calendarEvents: PersonalCalendarEvent[];
  reminders: ReminderRecord[];
  proposals: ActionProposal[];
  people: PersonRecord[];
  settings: Omit<Settings, "demoMode">;
}

export interface EcoApi {
  bootstrap(): Promise<BootstrapData>;
  lock(): Promise<void>;
  unlock(): Promise<BootstrapData>;
  setApiKey(key: string): Promise<{ ok: boolean }>;
  clearApiKey(): Promise<{ ok: boolean }>;
  setFifonesApiToken(token: string): Promise<{ ok: boolean }>;
  clearFifonesApiToken(): Promise<{ ok: boolean }>;
  testFifonesApi(): Promise<{ ok: boolean; message: string }>;
  decideProactiveSignal(fingerprint: string, decision: "accepted" | "dismissed" | "snoozed"): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  listMemories(): Promise<MemoryRecord[]>;
  saveMemory(input: MemoryInput): Promise<MemoryRecord>;
  reviewMemory(id: string, status: MemoryStatus): Promise<MemoryRecord>;
  deleteMemory(id: string): Promise<{ ok: boolean }>;
  createContract(input: ContractInput): Promise<PersuasionContract>;
  stopContract(id: string): Promise<PersuasionContract>;
  deleteContract(id: string): Promise<{ ok: boolean }>;
  sendChat(request: ChatRequest): Promise<ChatResponse>;
  transcribeAudio(audio: ArrayBuffer, mimeType: string): Promise<{ text: string }>;
  getLocalTtsStatus(): Promise<{ available: boolean; message: string }>;
  synthesizeLocalSpeech(text: string, voice: string): Promise<{ audioBase64: string }>;
  connectRealtime(request: RealtimeConnectRequest): Promise<{ sdp: string }>;
  saveRealtimeMessage(message: ChatMessage): Promise<void>;
  listTasks(): Promise<TaskRecord[]>;
  saveTask(input: TaskInput): Promise<TaskRecord>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<TaskRecord>;
  deleteTask(id: string): Promise<{ ok: boolean }>;
  listCalendarEvents(): Promise<PersonalCalendarEvent[]>;
  saveCalendarEvent(input: PersonalCalendarEventInput): Promise<PersonalCalendarEvent>;
  deleteCalendarEvent(id: string): Promise<{ ok: boolean }>;
  proposeTaskFromText(text: string, sourceMessageId?: string): Promise<ActionProposal | null>;
  resolveProposal(id: string, decision: "confirm" | "reject"): Promise<{
    proposal: ActionProposal;
    task?: TaskRecord;
  }>;
  listPendingApprovals(): Promise<ActionApproval[]>;
  resolveActionApproval(id: string, decision: "approve" | "reject"): Promise<ActionApproval>;
  listAuditEvents(limit?: number): Promise<AuditEvent[]>;
  snoozeReminder(id: string, minutes: number): Promise<ReminderRecord>;
  cancelReminder(id: string): Promise<ReminderRecord>;
  listPeople(): Promise<PersonRecord[]>;
  savePerson(input: PersonInput): Promise<PersonRecord>;
  deletePerson(id: string): Promise<{ ok: boolean }>;
  recordRealtimeUsage(usage: RealtimeUsage): Promise<UsageBudget>;
  setBudgetOverride(enabled: boolean): Promise<UsageBudget>;
  toggleCompactMode(): Promise<{ compact: boolean }>;
  toggleAuraOnly(): Promise<{ auraOnly: boolean }>;
  onCompactMode(listener: (compact: boolean) => void): () => void;
  onAuraOnly(listener: (auraOnly: boolean) => void): () => void;
  onNavigate(listener: (view: string) => void): () => void;
  connectGoogleCalendar(): Promise<CalendarEventRecord[]>;
  disconnectGoogleCalendar(): Promise<{ ok: boolean }>;
  listGoogleCalendarEvents(): Promise<CalendarEventRecord[]>;
  exportData(): Promise<{ canceled: boolean; path?: string }>;
  deleteAllData(): Promise<{ ok: boolean }>;
  summonWindow(): Promise<void>;
  takeScreenshot(): Promise<string>;
}



