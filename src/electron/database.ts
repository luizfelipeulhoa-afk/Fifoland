import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import type {
  ActionProposal,
  ActionApproval,
  AuditEvent,
  AppStats,
  ChatMessage,
  ContractInput,
  ExportBundle,
  MemoryInput,
  MemoryRecord,
  MemoryStatus,
  PersonalCalendarEvent,
  PersonalCalendarEventInput,
  PersonInput,
  PersonRecord,
  PersuasionContract,
  ReminderRecord,
  Settings,
  TaskInput,
  TaskRecord,
  TaskStatus,
  GamificationSummary,
  UsageBudget
} from "../shared/types.js";
import { findPotentialContradiction } from "../core/contradictions.js";
import { BUILTIN_SKILLS } from "../core/skills.js";
import { detectTaskDraft } from "../core/task-intent.js";
import { decryptBytes, encryptBytes, SecureKeyStore } from "./security.js";

const DEFAULT_SETTINGS: Settings = {
  name: "Fifo",
  reasoningModel: "gpt-5.6-luna",
  realtimeModel: "gpt-realtime-2.1-mini",
  voice: "cedar",
  autoLockMinutes: 10,
  demoMode: true,
  wakePhraseEnabled: false,
  voiceProfile: "economy",
  voiceLanguage: "auto",
  localVoiceUri: "",
  localVoiceProvider: "windows",
  kokoroVoice: "pm_alex",
  economyVoiceEnabled: true,
  economyVoiceMaxSeconds: 30,
  voiceReplyMaxSentences: 3,
  monthlyBudgetBrl: 30,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  proactiveEnabled: true,
  maxFollowups: 2,
  globalShortcut: "CommandOrControl+Shift+F",
  launchAtLogin: false,
  compactAlwaysOnTop: true,
  googleCalendarClientId: "",
  aiApiBaseUrl: ""
};

function now(): string {
  return new Date().toISOString();
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function payloadHash(payload: unknown): string {
  return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

function resultRows<T>(database: Database, sql: string, params: unknown[] = []): T[] {
  const statement = database.prepare(sql);
  statement.bind(params as (string | number | Uint8Array | null)[]);
  const rows: T[] = [];
  while (statement.step()) rows.push(statement.getAsObject() as unknown as T);
  statement.free();
  return rows;
}

interface MemoryRow {
  id: string;
  category: MemoryRecord["category"];
  title: string;
  content: string;
  source: string;
  source_detail: string | null;
  confidence: number;
  sensitivity: MemoryRecord["sensitivity"];
  status: MemoryRecord["status"];
  created_at: string;
  updated_at: string;
  revision: number;
  memory_kind: MemoryRecord["memoryKind"] | null;
  expires_at: string | null;
  reason: string | null;
}

function mapMemory(row: MemoryRow): MemoryRecord {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    content: row.content,
    source: row.source,
    sourceDetail: row.source_detail ?? undefined,
    confidence: row.confidence,
    sensitivity: row.sensitivity,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    revision: row.revision,
    memoryKind: row.memory_kind ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    reason: row.reason ?? undefined
  };
}

interface ContractRow {
  id: string;
  objective: string;
  reason: string;
  deadline: string | null;
  limits: string;
  intensity: 1 | 2 | 3;
  stop_condition: string;
  status: PersuasionContract["status"];
  created_at: string;
  stopped_at: string | null;
}

function mapContract(row: ContractRow): PersuasionContract {
  return {
    id: row.id,
    objective: row.objective,
    reason: row.reason,
    deadline: row.deadline ?? undefined,
    limits: row.limits,
    intensity: row.intensity,
    stopCondition: row.stop_condition,
    status: row.status,
    createdAt: row.created_at,
    stoppedAt: row.stopped_at ?? undefined
  };
}

interface MessageRow {
  id: string;
  role: ChatMessage["role"];
  content: string;
  created_at: string;
  mode: ChatMessage["mode"] | null;
  citations: string | null;
  high_risk: number;
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    mode: row.mode ?? undefined,
    citations: row.citations ? JSON.parse(row.citations) : undefined,
    highRisk: Boolean(row.high_risk)
  };
}

interface TaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  due_at: string | null;
  priority: TaskRecord["priority"];
  recurrence: string | null;
  goal_id: string | null;
  reminder_at: string | null;
  source_message_id: string | null;
  source_text: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function mapTask(row: TaskRow): TaskRecord {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    dueAt: row.due_at ?? undefined,
    priority: row.priority,
    recurrence: row.recurrence ?? undefined,
    goalId: row.goal_id ?? undefined,
    reminderAt: row.reminder_at ?? undefined,
    sourceMessageId: row.source_message_id ?? undefined,
    sourceText: row.source_text ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined
  };
}

interface ReminderRow {
  id: string;
  task_id: string;
  notify_at: string;
  status: ReminderRecord["status"];
  snoozed_until: string | null;
  followup_count: number;
  created_at: string;
  updated_at: string;
}

interface PersonalCalendarEventRow {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  notes: string | null;
  color: PersonalCalendarEvent["color"];
  created_at: string;
  updated_at: string;
}

function mapPersonalCalendarEvent(row: PersonalCalendarEventRow): PersonalCalendarEvent {
  return {
    id: row.id,
    title: row.title,
    start: row.start_at,
    end: row.end_at ?? undefined,
    notes: row.notes ?? undefined,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapReminder(row: ReminderRow): ReminderRecord {
  return {
    id: row.id,
    taskId: row.task_id,
    notifyAt: row.notify_at,
    status: row.status,
    snoozedUntil: row.snoozed_until ?? undefined,
    followupCount: row.followup_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

interface ProposalRow {
  id: string;
  type: ActionProposal["type"];
  status: ActionProposal["status"];
  payload: string;
  source_text: string;
  source_message_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

function mapProposal(row: ProposalRow): ActionProposal {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    payload: JSON.parse(row.payload),
    sourceText: row.source_text,
    sourceMessageId: row.source_message_id ?? undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined
  };
}

interface ActionApprovalRow {
  id: string;
  action_type: string;
  risk: ActionApproval["risk"];
  status: ActionApproval["status"];
  payload_hash: string;
  preview: string;
  resource_id: string | null;
  created_at: string;
  expires_at: string;
  resolved_at: string | null;
  consumed_at: string | null;
}

function mapActionApproval(row: ActionApprovalRow): ActionApproval {
  return {
    id: row.id,
    actionType: row.action_type,
    risk: row.risk,
    status: row.status,
    payloadHash: row.payload_hash,
    preview: row.preview,
    resourceId: row.resource_id ?? undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    resolvedAt: row.resolved_at ?? undefined,
    consumedAt: row.consumed_at ?? undefined
  };
}

interface AuditEventRow {
  id: string;
  action_type: string;
  risk: AuditEvent["risk"];
  decision: AuditEvent["decision"];
  summary: string;
  payload_hash: string | null;
  created_at: string;
}

function mapAuditEvent(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    actionType: row.action_type,
    risk: row.risk,
    decision: row.decision,
    summary: row.summary,
    payloadHash: row.payload_hash ?? undefined,
    createdAt: row.created_at
  };
}

interface PersonRow {
  id: string;
  name: string;
  relationship: string;
  context: string;
  confirmed_facts: string;
  open_loops: string;
  source_memory_ids: string;
  created_at: string;
  updated_at: string;
}

function mapPerson(row: PersonRow): PersonRecord {
  return {
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    context: row.context,
    confirmedFacts: row.confirmed_facts,
    openLoops: row.open_loops,
    sourceMemoryIds: JSON.parse(row.source_memory_ids),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class EncryptedDatabase {
  private database?: Database;
  private sql?: SqlJsStatic;
  private readonly databasePath: string;

  constructor(
    private readonly userDataPath: string,
    private readonly keyStore: SecureKeyStore,
    private readonly wasmPath: string
  ) {
    this.databasePath = path.join(userDataPath, "eco-memory.db.enc");
  }

  async open(): Promise<void> {
    if (this.database) return;
    if (!this.sql) {
      this.sql = await initSqlJs({ locateFile: () => this.wasmPath });
    }
    const SQL = this.sql;
    const key = await this.keyStore.getKey();
    try {
      const encrypted = await fs.readFile(this.databasePath);
      const decrypted = await decryptBytes(encrypted, key);
      this.database = new SQL.Database(decrypted);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
      this.database = new SQL.Database();
    }
    this.migrate();
    await this.persist();
  }

  async close(): Promise<void> {
    if (this.database) {
      await this.persist();
      this.database.close();
      this.database = undefined;
    }
    this.keyStore.clearFromMemory();
  }

  private db(): Database {
    if (!this.database) throw new Error("O cofre está bloqueado.");
    return this.database;
  }

  private migrate(): void {
    this.db().run(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        source_detail TEXT,
        confidence REAL NOT NULL,
        sensitivity TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 1,
        memory_kind TEXT NOT NULL DEFAULT 'fact',
        expires_at TEXT,
        reason TEXT
      );
      CREATE TABLE IF NOT EXISTS memory_revisions (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        snapshot TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(memory_id) REFERENCES memories(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY,
        objective TEXT NOT NULL,
        reason TEXT NOT NULL,
        deadline TEXT,
        limits TEXT NOT NULL,
        intensity INTEGER NOT NULL,
        stop_condition TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        stopped_at TEXT
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        mode TEXT,
        citations TEXT,
        high_risk INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        due_at TEXT,
        priority TEXT NOT NULL,
        recurrence TEXT,
        goal_id TEXT,
        reminder_at TEXT,
        source_message_id TEXT,
        source_text TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS personal_calendar_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        start_at TEXT NOT NULL,
        end_at TEXT,
        notes TEXT,
        color TEXT NOT NULL DEFAULT 'coral',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        notify_at TEXT NOT NULL,
        status TEXT NOT NULL,
        snoozed_until TEXT,
        followup_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS action_proposals (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        payload TEXT NOT NULL,
        source_text TEXT NOT NULL,
        source_message_id TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT
      );
      CREATE TABLE IF NOT EXISTS action_approvals (
        id TEXT PRIMARY KEY,
        action_type TEXT NOT NULL,
        risk TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        preview TEXT NOT NULL,
        resource_id TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        resolved_at TEXT,
        consumed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        action_type TEXT NOT NULL,
        risk TEXT NOT NULL,
        decision TEXT NOT NULL,
        summary TEXT NOT NULL,
        payload_hash TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_action_approvals_status_expires
        ON action_approvals(status, expires_at);
      CREATE INDEX IF NOT EXISTS idx_audit_events_created
        ON audit_events(created_at DESC);
      CREATE TABLE IF NOT EXISTS people (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        relationship TEXT NOT NULL,
        context TEXT NOT NULL,
        confirmed_facts TEXT NOT NULL DEFAULT '',
        open_loops TEXT NOT NULL,
        source_memory_ids TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS usage_records (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        model TEXT NOT NULL,
        estimated_brl REAL NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS proactive_notifications (
        fingerprint TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        view TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'shown',
        created_at TEXT NOT NULL,
        acted_at TEXT
      );
    `);

    const peopleColumns = resultRows<{ name: string }>(
      this.db(),
      "PRAGMA table_info(people)"
    );
    if (!peopleColumns.some((column) => column.name === "confirmed_facts")) {
      this.db().run(
        "ALTER TABLE people ADD COLUMN confirmed_facts TEXT NOT NULL DEFAULT ''"
      );
    }
    const memoryColumns = resultRows<{ name: string }>(this.db(), "PRAGMA table_info(memories)");
    if (!memoryColumns.some((column) => column.name === "memory_kind")) this.db().run("ALTER TABLE memories ADD COLUMN memory_kind TEXT NOT NULL DEFAULT 'fact'");
    if (!memoryColumns.some((column) => column.name === "expires_at")) this.db().run("ALTER TABLE memories ADD COLUMN expires_at TEXT");
    if (!memoryColumns.some((column) => column.name === "reason")) this.db().run("ALTER TABLE memories ADD COLUMN reason TEXT");

    const hadVoiceProfile = resultRows<{ count: number }>(
      this.db(),
      "SELECT COUNT(*) AS count FROM settings WHERE key = 'voiceProfile'"
    )[0]?.count;
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      this.db().run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [
        key,
        JSON.stringify(value)
      ]);
    }
    if (!hadVoiceProfile) {
      this.db().run(
        "UPDATE settings SET value = ? WHERE key = 'realtimeModel'",
        [JSON.stringify("gpt-realtime-2.1-mini")]
      );
    }
    this.db().run(
      "UPDATE settings SET value = ? WHERE key = 'reasoningModel' AND value = ?",
      [JSON.stringify("gpt-5.6-luna"), JSON.stringify("gpt-5-mini")]
    );
    this.db().run(
      "UPDATE settings SET value = ? WHERE key = 'voice' AND value = ?",
      [JSON.stringify("cedar"), JSON.stringify("verse")]
    );
    this.db().run(
      "UPDATE settings SET value = ? WHERE key = 'localVoiceProvider' AND value = ?",
      [JSON.stringify("windows"), JSON.stringify("kokoro")]
    );

    const profileMemories: Array<{
      id: string;
      category: MemoryRecord["category"];
      title: string;
      content: string;
    }> = [
      {
        id: "profile-fifo-identity",
        category: "fact",
        title: "Identidade de Fifo",
        content: "Meu nome é Fifo. Sou brasileiro e carioca."
      },
      {
        id: "profile-fifo-cheer",
        category: "experience",
        title: "Trajetória de alto nível no cheer",
        content:
          "Fui para a seleção e participei de algumas das melhores equipes de cheer dos Estados Unidos."
      },
      {
        id: "profile-fifo-teacher",
        category: "fact",
        title: "Professor de cheer",
        content: "Dou aulas de cheer para crianças e universitários."
      },
      {
        id: "profile-fifo-style",
        category: "preference",
        title: "Estilo de conversa",
        content:
          "Quero uma conversa informal, brasileira e com resenha, sem perder honestidade, profundidade e desafio."
      }
    ];
    const profileTimestamp = now();
    for (const memory of profileMemories) {
      this.db().run(
        `INSERT OR IGNORE INTO memories (
          id, category, title, content, source, source_detail, confidence,
          sensitivity, status, created_at, updated_at, revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          memory.id,
          memory.category,
          memory.title,
          memory.content,
          "Informado diretamente por Fifo",
          "Perfil inicial do Fifones",
          1,
          "normal",
          "confirmed",
          profileTimestamp,
          profileTimestamp
        ]
      );
    }
  }

  private async persist(): Promise<void> {
    if (!this.database) return;
    const key = await this.keyStore.getKey();
    const bytes = this.database.export();
    const encrypted = await encryptBytes(bytes, key);
    const temporaryPath = `${this.databasePath}.tmp`;
    await fs.mkdir(this.userDataPath, { recursive: true });
    await fs.writeFile(temporaryPath, encrypted, { mode: 0o600 });
    await fs.rename(temporaryPath, this.databasePath);
  }

  getSettings(): Settings {
    const rows = resultRows<{ key: keyof Settings; value: string }>(
      this.db(),
      "SELECT key, value FROM settings"
    );
    return rows.reduce<Settings>(
      (settings, row) => ({ ...settings, [row.key]: JSON.parse(row.value) }),
      { ...DEFAULT_SETTINGS }
    );
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    for (const [key, value] of Object.entries(patch)) {
      if (!(key in DEFAULT_SETTINGS)) continue;
      this.db().run(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, JSON.stringify(value)]
      );
    }
    await this.persist();
    return this.getSettings();
  }

  async recordProactiveSignal(signal: { fingerprint: string; kind: string; title: string; body: string; view: string }, cooldownMs = 30 * 60_000): Promise<boolean> {
    const existing = resultRows<{ created_at: string }>(this.db(), "SELECT created_at FROM proactive_notifications WHERE fingerprint = ?", [signal.fingerprint])[0];
    if (existing && Date.now() - Date.parse(existing.created_at) < cooldownMs) return false;
    const timestamp = now();
    this.db().run(`INSERT INTO proactive_notifications (fingerprint, kind, title, body, view, status, created_at) VALUES (?, ?, ?, ?, ?, 'shown', ?) ON CONFLICT(fingerprint) DO UPDATE SET created_at = excluded.created_at, status = 'shown'`, [signal.fingerprint, signal.kind, signal.title, signal.body, signal.view, timestamp]);
    await this.persist();
    return true;
  }

  async decideProactiveSignal(fingerprint: string, decision: "accepted" | "dismissed" | "snoozed"): Promise<void> {
    this.db().run("UPDATE proactive_notifications SET status = ?, acted_at = ? WHERE fingerprint = ?", [decision, now(), fingerprint]);
    await this.persist();
  }

  listMemories(): MemoryRecord[] {
    return resultRows<MemoryRow>(
      this.db(),
      "SELECT * FROM memories WHERE expires_at IS NULL OR expires_at > ? ORDER BY updated_at DESC", [now()]
    ).map(mapMemory);
  }

  async saveMemory(input: MemoryInput): Promise<MemoryRecord> {
    const timestamp = now();
    if (input.id) {
      const existing = this.getMemory(input.id);
      if (!existing) throw new Error("Memória não encontrada.");
      this.db().run(
        "INSERT INTO memory_revisions (id, memory_id, snapshot, created_at) VALUES (?, ?, ?, ?)",
        [randomUUID(), existing.id, JSON.stringify(existing), timestamp]
      );
      this.db().run(
        `UPDATE memories SET category = ?, title = ?, content = ?, source = ?,
        source_detail = ?, confidence = ?, sensitivity = ?, status = ?, memory_kind = ?, expires_at = ?, reason = ?,
        updated_at = ?, revision = revision + 1 WHERE id = ?`,
        [
          input.category,
          input.title,
          input.content,
          input.source,
          input.sourceDetail ?? null,
          input.confidence,
          input.sensitivity,
          input.status,
          input.memoryKind ?? "fact",
          input.expiresAt ?? null,
          input.reason ?? null,
          timestamp,
          input.id
        ]
      );
      await this.persist();
      return this.getMemory(input.id)!;
    }

    const id = randomUUID();
    this.db().run(
      `INSERT INTO memories (
        id, category, title, content, source, source_detail, confidence,
        sensitivity, status, created_at, updated_at, revision, memory_kind, expires_at, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        id,
        input.category,
        input.title,
        input.content,
        input.source,
        input.sourceDetail ?? null,
        input.confidence,
        input.sensitivity,
        input.status,
        timestamp,
        timestamp,
        input.memoryKind ?? "fact",
        input.expiresAt ?? null,
        input.reason ?? null
      ]
    );
    await this.persist();
    return this.getMemory(id)!;
  }

  getMemory(id: string): MemoryRecord | undefined {
    const row = resultRows<MemoryRow>(
      this.db(),
      "SELECT * FROM memories WHERE id = ?",
      [id]
    )[0];
    return row ? mapMemory(row) : undefined;
  }

  async reviewMemory(id: string, status: MemoryStatus): Promise<MemoryRecord> {
    const memory = this.getMemory(id);
    if (!memory) throw new Error("Memória não encontrada.");
    const reviewed = await this.saveMemory({ ...memory, status });
    if (status === "confirmed") {
      const match = findPotentialContradiction(reviewed, this.listMemories());
      if (match) {
        const alreadyExists = this.listMemories().some(
          (item) =>
            item.category === "contradiction" &&
            item.status !== "rejected" &&
            item.content.includes(reviewed.id) &&
            item.content.includes(match.memory.id)
        );
        if (!alreadyExists) {
          await this.saveMemory({
            category: "contradiction",
            title: `Possível tensão: ${match.memory.title} × ${reviewed.title}`,
            content: [
              `Referência anterior (${match.memory.id}): ${match.memory.content}`,
              `Referência nova (${reviewed.id}): ${reviewed.content}`,
              "Isto pode indicar mudança real, diferença de contexto ou uma contradição. Revise antes de confirmar."
            ].join("\n\n"),
            source: "Detecção vetorial local",
            confidence: Math.min(0.7, match.score + 0.25),
            sensitivity:
              reviewed.sensitivity === "restricted" ||
              match.memory.sensitivity === "restricted"
                ? "restricted"
                : "sensitive",
            status: "candidate"
          });
        }
      }
    }
    return reviewed;
  }

  async deleteMemory(id: string): Promise<void> {
    this.db().run("DELETE FROM memories WHERE id = ?", [id]);
    await this.persist();
  }

  listContracts(): PersuasionContract[] {
    return resultRows<ContractRow>(
      this.db(),
      "SELECT * FROM contracts ORDER BY created_at DESC"
    ).map(mapContract);
  }

  activeContract(): PersuasionContract | undefined {
    const row = resultRows<ContractRow>(
      this.db(),
      "SELECT * FROM contracts WHERE status = 'active' ORDER BY created_at DESC LIMIT 1"
    )[0];
    return row ? mapContract(row) : undefined;
  }

  async createContract(input: ContractInput): Promise<PersuasionContract> {
    this.db().run(
      "UPDATE contracts SET status = 'stopped', stopped_at = ? WHERE status = 'active'",
      [now()]
    );
    const id = randomUUID();
    this.db().run(
      `INSERT INTO contracts (
        id, objective, reason, deadline, limits, intensity, stop_condition,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        id,
        input.objective,
        input.reason,
        input.deadline ?? null,
        input.limits,
        input.intensity,
        input.stopCondition,
        now()
      ]
    );
    await this.persist();
    return this.listContracts().find((contract) => contract.id === id)!;
  }

  async stopContract(id: string): Promise<PersuasionContract> {
    this.db().run(
      "UPDATE contracts SET status = 'stopped', stopped_at = ? WHERE id = ?",
      [now(), id]
    );
    await this.persist();
    const contract = this.listContracts().find((item) => item.id === id);
    if (!contract) throw new Error("Contrato não encontrado.");
    return contract;
  }

  async deleteContract(id: string): Promise<void> {
    this.db().run("DELETE FROM contracts WHERE id = ?", [id]);
    await this.persist();
  }

  listMessages(limit = 100): ChatMessage[] {
    return resultRows<MessageRow>(
      this.db(),
      "SELECT * FROM messages ORDER BY created_at DESC LIMIT ?",
      [limit]
    )
      .map(mapMessage)
      .reverse();
  }

  async saveMessage(message: ChatMessage): Promise<void> {
    this.db().run(
      `INSERT OR REPLACE INTO messages
      (id, role, content, created_at, mode, citations, high_risk)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.role,
        message.content,
        message.createdAt,
        message.mode ?? null,
        message.citations ? JSON.stringify(message.citations) : null,
        message.highRisk ? 1 : 0
      ]
    );
    await this.persist();
  }

  listTasks(): TaskRecord[] {
    return resultRows<TaskRow>(
      this.db(),
      "SELECT * FROM tasks ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, COALESCE(due_at, '9999') ASC, created_at DESC"
    ).map(mapTask);
  }

  getTask(id: string): TaskRecord | undefined {
    const row = resultRows<TaskRow>(this.db(), "SELECT * FROM tasks WHERE id = ?", [id])[0];
    return row ? mapTask(row) : undefined;
  }

  async saveTask(input: TaskInput): Promise<TaskRecord> {
    const id = randomUUID();
    const timestamp = now();
    this.db().run(
      `INSERT INTO tasks (
        id, title, status, due_at, priority, recurrence, goal_id, reminder_at,
        source_message_id, source_text, created_at, updated_at
      ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title.trim(),
        input.dueAt ?? null,
        input.priority,
        input.recurrence ?? null,
        input.goalId ?? null,
        input.reminderAt ?? null,
        input.sourceMessageId ?? null,
        input.sourceText ?? null,
        timestamp,
        timestamp
      ]
    );
    if (input.reminderAt) {
      this.db().run(
        `INSERT INTO reminders (
          id, task_id, notify_at, status, snoozed_until, followup_count, created_at, updated_at
        ) VALUES (?, ?, ?, 'scheduled', NULL, 0, ?, ?)`,
        [randomUUID(), id, input.reminderAt, timestamp, timestamp]
      );
    }
    await this.persist();
    return this.getTask(id)!;
  }

  async updateTaskStatus(id: string, status: TaskStatus): Promise<TaskRecord> {
    const task = this.getTask(id);
    if (!task) throw new Error("Tarefa não encontrada.");
    const timestamp = now();
    this.db().run(
      "UPDATE tasks SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?",
      [status, timestamp, status === "completed" ? timestamp : null, id]
    );
    if (status !== "pending") {
      this.db().run(
        "UPDATE reminders SET status = ?, updated_at = ? WHERE task_id = ? AND status NOT IN ('cancelled', 'completed')",
        [status === "completed" ? "completed" : "cancelled", timestamp, id]
      );
    }
    await this.persist();
    return this.getTask(id)!;
  }

  async deleteTask(id: string): Promise<void> {
    const task = this.getTask(id);
    this.db().run("DELETE FROM reminders WHERE task_id = ?", [id]);
    this.db().run("DELETE FROM tasks WHERE id = ?", [id]);
    if (task?.sourceMessageId) {
      this.db().run(
        "DELETE FROM action_proposals WHERE type = 'create_task' AND source_message_id = ?",
        [task.sourceMessageId]
      );
    } else if (task?.sourceText) {
      this.db().run(
        "DELETE FROM action_proposals WHERE type = 'create_task' AND source_text = ?",
        [task.sourceText]
      );
    }
    await this.persist();
  }

  listCalendarEvents(): PersonalCalendarEvent[] {
    return resultRows<PersonalCalendarEventRow>(
      this.db(),
      "SELECT * FROM personal_calendar_events ORDER BY start_at ASC"
    ).map(mapPersonalCalendarEvent);
  }

  async saveCalendarEvent(input: PersonalCalendarEventInput): Promise<PersonalCalendarEvent> {
    const id = input.id ?? randomUUID();
    const timestamp = now();
    this.db().run(
      `INSERT INTO personal_calendar_events (
        id, title, start_at, end_at, notes, color, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        start_at = excluded.start_at,
        end_at = excluded.end_at,
        notes = excluded.notes,
        color = excluded.color,
        updated_at = excluded.updated_at`,
      [
        id,
        input.title.trim(),
        input.start,
        input.end ?? null,
        input.notes?.trim() || null,
        input.color ?? "coral",
        timestamp,
        timestamp
      ]
    );
    await this.persist();
    return this.listCalendarEvents().find((event) => event.id === id)!;
  }

  async deleteCalendarEvent(id: string): Promise<void> {
    this.db().run("DELETE FROM personal_calendar_events WHERE id = ?", [id]);
    await this.persist();
  }

  listReminders(): ReminderRecord[] {
    return resultRows<ReminderRow>(
      this.db(),
      "SELECT * FROM reminders ORDER BY notify_at ASC"
    ).map(mapReminder);
  }

  dueReminders(reference = now()): ReminderRecord[] {
    return resultRows<ReminderRow>(
      this.db(),
      `SELECT * FROM reminders
       WHERE status IN ('scheduled', 'snoozed')
       AND COALESCE(snoozed_until, notify_at) <= ?
       ORDER BY COALESCE(snoozed_until, notify_at) ASC`,
      [reference]
    ).map(mapReminder);
  }

  async markReminderShown(id: string): Promise<void> {
    this.db().run(
      "UPDATE reminders SET status = 'shown', followup_count = followup_count + 1, updated_at = ? WHERE id = ?",
      [now(), id]
    );
    await this.persist();
  }

  async snoozeReminder(id: string, minutes: number): Promise<ReminderRecord> {
    const next = new Date(Date.now() + Math.max(1, minutes) * 60_000).toISOString();
    this.db().run(
      "UPDATE reminders SET status = 'snoozed', snoozed_until = ?, updated_at = ? WHERE id = ?",
      [next, now(), id]
    );
    await this.persist();
    const row = resultRows<ReminderRow>(this.db(), "SELECT * FROM reminders WHERE id = ?", [id])[0];
    if (!row) throw new Error("Lembrete não encontrado.");
    return mapReminder(row);
  }

  async cancelReminder(id: string): Promise<ReminderRecord> {
    this.db().run(
      "UPDATE reminders SET status = 'cancelled', updated_at = ? WHERE id = ?",
      [now(), id]
    );
    await this.persist();
    const row = resultRows<ReminderRow>(this.db(), "SELECT * FROM reminders WHERE id = ?", [id])[0];
    if (!row) throw new Error("Lembrete não encontrado.");
    return mapReminder(row);
  }

  listProposals(): ActionProposal[] {
    return resultRows<ProposalRow>(
      this.db(),
      "SELECT * FROM action_proposals ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC"
    ).map(mapProposal);
  }

  async proposeTaskFromText(
    text: string,
    sourceMessageId?: string
  ): Promise<ActionProposal | null> {
    const draft = detectTaskDraft(text);
    if (!draft) return null;
    const duplicate = this.listProposals().find(
      (proposal) =>
        proposal.status === "pending" &&
        proposal.sourceMessageId === sourceMessageId &&
        proposal.sourceText === text
    );
    if (duplicate) return duplicate;
    const id = randomUUID();
    this.db().run(
      `INSERT INTO action_proposals (
        id, type, status, payload, source_text, source_message_id, created_at
      ) VALUES (?, 'create_task', 'pending', ?, ?, ?, ?)`,
      [id, JSON.stringify(draft), text, sourceMessageId ?? null, now()]
    );
    this.insertAuditEvent({
      actionType: "create_task",
      risk: "draft",
      decision: "proposed",
      summary: "Rascunho local criado; nada foi executado sem confirmação.",
      payloadHash: payloadHash(draft)
    });
    await this.persist();
    return this.listProposals().find((proposal) => proposal.id === id)!;
  }

  async resolveProposal(
    id: string,
    decision: "confirm" | "reject"
  ): Promise<{ proposal: ActionProposal; task?: TaskRecord }> {
    const proposal = this.listProposals().find((item) => item.id === id);
    if (!proposal) throw new Error("Rascunho não encontrado.");
    if (proposal.status !== "pending") return { proposal };
    const resolvedAt = now();
    this.db().run(
      "UPDATE action_proposals SET status = ?, resolved_at = ? WHERE id = ?",
      [decision === "confirm" ? "confirmed" : "rejected", resolvedAt, id]
    );
    this.insertAuditEvent({
      actionType: proposal.type,
      risk: "draft",
      decision: decision === "confirm" ? "approved" : "rejected",
      summary: decision === "confirm" ? "Rascunho local confirmado pela pessoa." : "Rascunho local rejeitado pela pessoa.",
      payloadHash: payloadHash(proposal.payload)
    });
    let task: TaskRecord | undefined;
    if (decision === "confirm" && proposal.type === "create_task") {
      task = await this.saveTask({
        ...proposal.payload,
        sourceMessageId: proposal.sourceMessageId,
        sourceText: proposal.sourceText
      });
    } else {
      await this.persist();
    }
    const resolved = this.listProposals().find((item) => item.id === id)!;
    return { proposal: resolved, task };
  }

  private insertAuditEvent(input: Omit<AuditEvent, "id" | "createdAt">): void {
    this.db().run(
      `INSERT INTO audit_events (
        id, action_type, risk, decision, summary, payload_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        input.actionType,
        input.risk,
        input.decision,
        input.summary,
        input.payloadHash ?? null,
        now()
      ]
    );
  }

  listPendingApprovals(): ActionApproval[] {
    return resultRows<ActionApprovalRow>(
      this.db(),
      "SELECT * FROM action_approvals WHERE status = 'pending' AND expires_at > ? ORDER BY created_at DESC",
      [now()]
    ).map(mapActionApproval);
  }

  listAuditEvents(limit = 20): AuditEvent[] {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    return resultRows<AuditEventRow>(
      this.db(),
      `SELECT * FROM audit_events ORDER BY created_at DESC LIMIT ${safeLimit}`
    ).map(mapAuditEvent);
  }

  async createActionApproval(input: {
    actionType: string;
    risk: ActionApproval["risk"];
    payload: unknown;
    preview: string;
    resourceId?: string;
    ttlMs?: number;
  }): Promise<ActionApproval> {
    const id = randomUUID();
    const createdAt = now();
    const expiresAt = new Date(Date.now() + Math.max(10_000, input.ttlMs ?? 120_000)).toISOString();
    const hash = payloadHash(input.payload);
    this.db().run(
      `INSERT INTO action_approvals (
        id, action_type, risk, status, payload_hash, preview, resource_id, created_at, expires_at
      ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      [id, input.actionType, input.risk, hash, input.preview, input.resourceId ?? null, createdAt, expiresAt]
    );
    this.insertAuditEvent({
      actionType: input.actionType,
      risk: input.risk,
      decision: "proposed",
      summary: "Ação aguardando autorização explícita.",
      payloadHash: hash
    });
    await this.persist();
    return mapActionApproval(resultRows<ActionApprovalRow>(this.db(), "SELECT * FROM action_approvals WHERE id = ?", [id])[0]);
  }

  async resolveActionApproval(
    id: string,
    decision: "approve" | "reject"
  ): Promise<ActionApproval> {
    const row = resultRows<ActionApprovalRow>(this.db(), "SELECT * FROM action_approvals WHERE id = ?", [id])[0];
    if (!row) throw new Error("Autorização não encontrada.");
    const approval = mapActionApproval(row);
    if (approval.status !== "pending") return approval;
    const expired = new Date(approval.expiresAt).getTime() <= Date.now();
    const status: ActionApproval["status"] = expired ? "expired" : decision === "approve" ? "approved" : "rejected";
    this.db().run("UPDATE action_approvals SET status = ?, resolved_at = ? WHERE id = ?", [status, now(), id]);
    this.insertAuditEvent({
      actionType: approval.actionType,
      risk: approval.risk,
      decision: status,
      summary:
        status === "approved"
          ? "Ação autorizada para este conteúdo e por tempo limitado."
          : status === "expired"
            ? "Autorização expirou sem execução."
            : "Ação rejeitada pela pessoa.",
      payloadHash: approval.payloadHash
    });
    await this.persist();
    return mapActionApproval(resultRows<ActionApprovalRow>(this.db(), "SELECT * FROM action_approvals WHERE id = ?", [id])[0]);
  }

  listPeople(): PersonRecord[] {
    return resultRows<PersonRow>(
      this.db(),
      "SELECT * FROM people ORDER BY name COLLATE NOCASE"
    ).map(mapPerson);
  }

  async savePerson(input: PersonInput): Promise<PersonRecord> {
    const timestamp = now();
    const id = input.id ?? randomUUID();
    this.db().run(
      `INSERT INTO people (
        id, name, relationship, context, confirmed_facts, open_loops,
        source_memory_ids, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name,
        relationship = excluded.relationship, context = excluded.context,
        confirmed_facts = excluded.confirmed_facts, open_loops = excluded.open_loops,
        source_memory_ids = excluded.source_memory_ids,
        updated_at = excluded.updated_at`,
      [
        id,
        input.name.trim(),
        input.relationship.trim(),
        input.context.trim(),
        input.confirmedFacts.trim(),
        input.openLoops.trim(),
        JSON.stringify(input.sourceMemoryIds ?? []),
        timestamp,
        timestamp
      ]
    );
    await this.persist();
    return this.listPeople().find((person) => person.id === id)!;
  }

  async deletePerson(id: string): Promise<void> {
    this.db().run("DELETE FROM people WHERE id = ?", [id]);
    await this.persist();
  }

  async recordUsage(kind: string, model: string, estimatedBrl: number): Promise<UsageBudget> {
    this.db().run(
      "INSERT INTO usage_records (id, kind, model, estimated_brl, created_at) VALUES (?, ?, ?, ?, ?)",
      [randomUUID(), kind, model, Math.max(0, estimatedBrl), now()]
    );
    await this.persist();
    return this.getUsageBudget();
  }

  getUsageBudget(): UsageBudget {
    const month = now().slice(0, 7);
    const row = resultRows<{ total: number }>(
      this.db(),
      "SELECT COALESCE(SUM(estimated_brl), 0) AS total FROM usage_records WHERE substr(created_at, 1, 7) = ?",
      [month]
    )[0];
    const limitBrl = this.getSettings().monthlyBudgetBrl;
    const estimatedBrl = Number(row?.total ?? 0);
    return {
      month,
      estimatedBrl,
      limitBrl,
      percentUsed: limitBrl > 0 ? Math.min(100, (estimatedBrl / limitBrl) * 100) : 100,
      blocked: limitBrl > 0 && estimatedBrl >= limitBrl
    };
  }

  getSkills() {
    return BUILTIN_SKILLS;
  }

  getStats(): AppStats {
    const memories = this.listMemories();
    return {
      confirmed: memories.filter((memory) => memory.status === "confirmed").length,
      candidates: memories.filter((memory) => memory.status === "candidate").length,
      values: memories.filter(
        (memory) => memory.category === "value" && memory.status === "confirmed"
      ).length,
      goals: memories.filter(
        (memory) => memory.category === "goal" && memory.status === "confirmed"
      ).length,
      activeContract: Boolean(this.activeContract()),
      pendingTasks: this.listTasks().filter((task) => task.status === "pending").length
    };
  }

  getGamification(): GamificationSummary {
    const completed = this.listTasks().filter(
      (task) => task.status === "completed" && task.completedAt
    );
    const xpFor = (task: TaskRecord) =>
      task.priority === "high" ? 25 : task.priority === "normal" ? 15 : 10;
    const totalXp = completed.reduce((sum, task) => sum + xpFor(task), 0);
    const dateKey = (value: Date | string) => {
      const date = typeof value === "string" ? new Date(value) : value;
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };
    const byDay = new Set(completed.map((task) => dateKey(task.completedAt!)));
    const streakFrom = (start: Date) => {
      let count = 0;
      const cursor = new Date(start);
      while (byDay.has(dateKey(cursor))) {
        count += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      return count;
    };
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const currentStreak = streakFrom(byDay.has(dateKey(today)) ? today : yesterday);
    const orderedDays = [...byDay].sort();
    let longestStreak = 0;
    let running = 0;
    let previous: Date | undefined;
    for (const day of orderedDays) {
      const [year, month, date] = day.split("-").map(Number);
      const current = new Date(Date.UTC(year, month - 1, date));
      running = previous && current.getTime() - previous.getTime() === 86_400_000 ? running + 1 : 1;
      longestStreak = Math.max(longestStreak, running);
      previous = current;
    }
    const level = Math.floor(totalXp / 100) + 1;
    return {
      totalXp,
      level,
      xpIntoLevel: totalXp % 100,
      xpForNextLevel: 100,
      currentStreak,
      longestStreak,
      completedToday: completed.filter((task) => dateKey(task.completedAt!) === dateKey(today)).length
    };
  }

  exportBundle(): ExportBundle {
    const { demoMode: _demoMode, ...safeSettings } = this.getSettings();
    return {
      exportedAt: now(),
      schemaVersion: 2,
      memories: this.listMemories(),
      contracts: this.listContracts(),
      messages: this.listMessages(10000),
      tasks: this.listTasks(),
      calendarEvents: this.listCalendarEvents(),
      reminders: this.listReminders(),
      proposals: this.listProposals(),
      people: this.listPeople(),
      settings: safeSettings
    };
  }

  async deleteAllData(): Promise<void> {
    this.db().run(`
      DELETE FROM memory_revisions;
      DELETE FROM memories;
      DELETE FROM contracts;
      DELETE FROM messages;
      DELETE FROM reminders;
      DELETE FROM tasks;
      DELETE FROM personal_calendar_events;
      DELETE FROM action_proposals;
      DELETE FROM action_approvals;
      DELETE FROM audit_events;
      DELETE FROM people;
      DELETE FROM usage_records;
    `);
    await this.persist();
  }
}

export function resolveSqlWasmPath(
  appPath: string,
  resourcesPath: string,
  packaged: boolean
): string {
  try {
    const resolved = require.resolve("sql.js/dist/sql-wasm.wasm");
    return packaged
      ? resolved.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`)
      : resolved;
  } catch {
    // Keep a deterministic fallback so startup reports the exact expected path.
  }
  return packaged
    ? path.join(
        resourcesPath,
        "app.asar.unpacked",
        "node_modules",
        "sql.js",
        "dist",
        "sql-wasm.wasm"
      )
    : path.join(appPath, "node_modules", "sql.js", "dist", "sql-wasm.wasm");
}
