import {
  AlarmClock,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ListTodo,
  Maximize2,
  Mic,
  Minimize2,
  RotateCcw,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import type {
  ActionProposal,
  BootstrapData,
  CalendarEventRecord,
  ReminderRecord,
  TaskRecord
} from "../shared/types";

function readableDate(value?: string): string {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function ProposalCard({
  proposal,
  onResolve
}: {
  proposal: ActionProposal;
  onResolve: (id: string, decision: "confirm" | "reject") => Promise<void>;
}) {
  return (
    <article className="today-proposal">
      <div className="today-proposal-icon"><Sparkles size={19} /></div>
      <div>
        <span className="eyebrow">FIFO, FOI ISSO QUE EU ENTENDI</span>
        <h3>{proposal.payload.title}</h3>
        <p>{readableDate(proposal.payload.dueAt)} · prioridade {proposal.payload.priority}</p>
        <blockquote>“{proposal.sourceText}”</blockquote>
      </div>
      <div className="today-proposal-actions">
        <button className="primary-button" onClick={() => void onResolve(proposal.id, "confirm")}>
          <Check size={16} /> Confirmar
        </button>
        <button className="ghost-button" onClick={() => void onResolve(proposal.id, "reject")}>
          <X size={16} /> Não era isso
        </button>
      </div>
    </article>
  );
}

function TaskRow({
  task,
  onStatus,
  onDelete
}: {
  task: TaskRecord;
  onStatus: (id: string, status: TaskRecord["status"]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <article className={`today-task ${task.status}`}>
      <button
        className="task-check"
        aria-label={task.status === "completed" ? "Reabrir tarefa" : "Concluir tarefa"}
        onClick={() => void onStatus(task.id, task.status === "completed" ? "pending" : "completed")}
      >
        {task.status === "completed" ? <CheckCircle2 size={21} /> : <span />}
      </button>
      <div>
        <h3>{task.title}</h3>
        <p><Clock3 size={13} /> {readableDate(task.dueAt)}</p>
      </div>
      <span className={`task-priority ${task.priority}`}>{task.priority}</span>
      <button className="task-delete" onClick={() => void onDelete(task.id)} aria-label="Excluir tarefa">
        <Trash2 size={16} />
      </button>
    </article>
  );
}

function ReminderRow({
  reminder,
  task,
  onSnooze,
  onCancel
}: {
  reminder: ReminderRecord;
  task?: TaskRecord;
  onSnooze: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}) {
  return (
    <article className="today-reminder">
      <AlarmClock size={18} />
      <div>
        <strong>{task?.title ?? "Lembrete"}</strong>
        <span>{readableDate(reminder.snoozedUntil ?? reminder.notifyAt)}</span>
      </div>
      <button onClick={() => void onSnooze(reminder.id)}><RotateCcw size={14} /> 15 min</button>
      <button onClick={() => void onCancel(reminder.id)}><X size={14} /></button>
    </article>
  );
}

export function TodayView({
  data,
  onRefresh,
  onNotify,
  onStartVoice,
  auraOnly,
  onToggleAuraOnly
}: {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  onNotify: (message: string) => void;
  onStartVoice: (prompt: string) => void;
  auraOnly: boolean;
  onToggleAuraOnly: () => void;
}) {
  const [capture, setCapture] = useState("");
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRecord[]>([]);
  const [calendarError, setCalendarError] = useState("");
  const [calendarLoaded, setCalendarLoaded] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const pendingTasks = data.tasks.filter((task) => task.status === "pending");
  const completedTasks = data.tasks.filter((task) => task.status === "completed");
  const proposals = data.proposals.filter((proposal) => proposal.status === "pending");
  const reminders = data.reminders.filter((reminder) =>
    ["scheduled", "snoozed", "shown"].includes(reminder.status)
  );
  const nextTask = useMemo(
    () => pendingTasks.find((task) => task.dueAt) ?? pendingTasks[0],
    [pendingTasks]
  );

  async function loadCalendar() {
    setCalendarLoading(true);
    try {
      setCalendarEvents(await window.eco.listGoogleCalendarEvents());
      setCalendarError("");
      setCalendarLoaded(true);
    } catch (error) {
      setCalendarError(
        error instanceof Error ? error.message : "Não foi possível ler sua agenda."
      );
      setCalendarLoaded(true);
    } finally {
      setCalendarLoading(false);
    }
  }

  async function propose(event: FormEvent) {
    event.preventDefault();
    const text = capture.trim();
    if (!text) return;
    const normalized = /\b(preciso|tenho que|me lembra|não posso esquecer)\b/i.test(text)
      ? text
      : `Preciso ${text}`;
    const proposal = await window.eco.proposeTaskFromText(normalized);
    if (!proposal) {
      onNotify("Não consegui reconhecer a tarefa. Tente: “Preciso preparar a aula sexta às 18h”.");
      return;
    }
    setCapture("");
    await onRefresh();
    onNotify("Rascunho criado. Confirme antes de virar tarefa.");
  }

  async function resolve(id: string, decision: "confirm" | "reject") {
    await window.eco.resolveProposal(id, decision);
    await onRefresh();
    onNotify(decision === "confirm" ? "Fechado. Tarefa confirmada." : "Rascunho descartado.");
  }

  return (
    <div className="today-view">
      <section className="today-hero">
        <button
          className="today-collapse"
          onClick={onToggleAuraOnly}
          aria-label={auraOnly ? "Expandir Fifones" : "Deixar somente a aura"}
        >
          {auraOnly ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
        </button>
        <div className="today-copy">
          <span className="eyebrow">HOJE COM FIFONES</span>
          <h1>Qual é a boa de hoje, Fifo?</h1>
          <p>Fala, confirma e segue sua vida. Eu seguro o próximo passo sem te perseguir.</p>
          <div className="today-quick-actions">
            <button onClick={() => onStartVoice("resenha")}><Mic size={17} /> Resenha rápida</button>
            <button onClick={() => onStartVoice("planejar")}><CalendarDays size={17} /> Planejar meu dia</button>
            <button onClick={() => onStartVoice("evitando")}><Sparkles size={17} /> O que estou evitando?</button>
          </div>
        </div>
        <button className="today-aura" onClick={() => onStartVoice("resenha")} aria-label="Conversar com Fifones">
          <span /><i /><i /><i />
          <Mic size={28} />
        </button>
        <aside className="today-next">
          <span>PRÓXIMO PASSO</span>
          <strong>{nextTask?.title ?? "Definir a primeira tarefa"}</strong>
          <p>{readableDate(nextTask?.dueAt)}</p>
          <ArrowRight size={18} />
        </aside>
      </section>

      <form className="today-capture" onSubmit={propose}>
        <Mic size={18} />
        <input
          value={capture}
          onChange={(event) => setCapture(event.target.value)}
          placeholder="Ex.: preciso preparar a aula sexta às 18h"
        />
        <button type="submit">Criar rascunho</button>
      </form>

      <section className="today-progress" aria-label="Seu progresso">
        <div>
          <span>NÍVEL ATUAL</span>
          <strong>{data.gamification.level}</strong>
          <small>{data.gamification.totalXp} XP acumulados</small>
        </div>
        <div className="today-progress-meter">
          <span>PRÓXIMA CONQUISTA</span>
          <strong>{data.gamification.xpIntoLevel} / {data.gamification.xpForNextLevel} XP</strong>
          <i><b style={{ width: `${data.gamification.xpIntoLevel}%` }} /></i>
        </div>
        <div>
          <span>SEQUÊNCIA</span>
          <strong>{data.gamification.currentStreak} {data.gamification.currentStreak === 1 ? "dia" : "dias"}</strong>
          <small>{data.gamification.completedToday} concluída(s) hoje</small>
        </div>
      </section>

      {proposals.length > 0 && (
        <section className="today-proposals">
          {proposals.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} onResolve={resolve} />
          ))}
        </section>
      )}

      <div className="today-grid">
        <section className="today-panel">
          <header>
            <div><ListTodo size={19} /><span><strong>Suas tarefas</strong><small>{pendingTasks.length} pendentes</small></span></div>
          </header>
          <div className="today-task-list">
            {pendingTasks.length === 0 && <p className="today-empty">Nada pendente. Boa, Fifo.</p>}
            {pendingTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onStatus={async (id, status) => {
                  await window.eco.updateTaskStatus(id, status);
                  await onRefresh();
                }}
                onDelete={async (id) => {
                  await window.eco.deleteTask(id);
                  await onRefresh();
                }}
              />
            ))}
          </div>
          {completedTasks.length > 0 && <small className="today-completed">{completedTasks.length} concluídas no histórico</small>}
        </section>

        <section className="today-panel reminders">
          <header>
            <div><AlarmClock size={19} /><span><strong>Lembretes</strong><small>sem culpa, no seu tempo</small></span></div>
          </header>
          <div className="today-reminder-list">
            {reminders.length === 0 && <p className="today-empty">Nenhum lembrete agendado.</p>}
            {reminders.map((reminder) => (
              <ReminderRow
                key={reminder.id}
                reminder={reminder}
                task={data.tasks.find((task) => task.id === reminder.taskId)}
                onSnooze={async (id) => {
                  await window.eco.snoozeReminder(id, 15);
                  await onRefresh();
                }}
                onCancel={async (id) => {
                  await window.eco.cancelReminder(id);
                  await onRefresh();
                }}
              />
            ))}
          </div>
        </section>
      </div>

      {data.googleCalendarConnected && (
        <section className="today-calendar">
          <header>
            <div>
              <CalendarDays size={19} />
              <span>
                <strong>Próximos da agenda</strong>
                <small>Google Calendar · somente leitura</small>
              </span>
            </div>
            <button onClick={() => void loadCalendar()} disabled={calendarLoading}>
              {calendarLoading ? "Lendo..." : calendarLoaded ? "Atualizar" : "Ler agenda agora"}
            </button>
          </header>
          {!calendarLoaded ? (
            <p className="today-empty">
              A agenda só será consultada quando você pedir. Nenhum dado é enviado enquanto o Fifones aguarda.
            </p>
          ) : calendarError ? (
            <p className="today-empty">{calendarError}</p>
          ) : calendarEvents.length === 0 ? (
            <p className="today-empty">Nenhum evento nos próximos 30 dias.</p>
          ) : (
            <div className="today-calendar-list">
              {calendarEvents.slice(0, 6).map((event) => (
                <a
                  key={event.id}
                  href={event.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className={!event.htmlLink ? "disabled" : undefined}
                  onClick={(clickEvent) => {
                    if (!event.htmlLink) clickEvent.preventDefault();
                  }}
                >
                  <time>{readableDate(event.start)}</time>
                  <strong>{event.title}</strong>
                  <span>{event.location ?? "Agenda principal"}</span>
                  <ArrowRight size={15} />
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      <section className={`today-budget ${data.usageBudget.percentUsed >= 80 ? "warning" : ""}`}>
        <span>
          {data.usageBudget.blocked
            ? "LIMITE DE IA ATINGIDO"
            : data.usageBudget.percentUsed >= 80
              ? "ATENÇÃO AO ORÇAMENTO"
              : "ORÇAMENTO DE IA"}
        </span>
        <div><i style={{ width: `${data.usageBudget.percentUsed}%` }} /></div>
        <strong>R$ {data.usageBudget.estimatedBrl.toFixed(2)} de R$ {data.usageBudget.limitBrl.toFixed(2)}</strong>
      </section>
    </div>
  );
}
