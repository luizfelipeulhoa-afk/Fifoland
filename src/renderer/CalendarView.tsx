import {
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Flame,
  Trash2,
  Trophy
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import type { BootstrapData, PersonalCalendarEventInput } from "../shared/types";

const COLORS: Array<{ value: PersonalCalendarEventInput["color"]; label: string }> = [
  { value: "coral", label: "Coral" },
  { value: "violet", label: "Violeta" },
  { value: "blue", label: "Azul" },
  { value: "green", label: "Verde" }
];

function localKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekdayLabel(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
    .format(date)
    .replace(".", "");
}

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value)
  );
}

export function CalendarView({
  data,
  onRefresh,
  onNotify
}: {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  onNotify: (message: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    start: `${localKey(new Date())}T09:00`,
    end: "",
    notes: "",
    color: "coral" as const
  });
  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    await window.eco.saveCalendarEvent({
      title: form.title,
      start: new Date(form.start).toISOString(),
      end: form.end ? new Date(form.end).toISOString() : undefined,
      notes: form.notes,
      color: form.color
    });
    setForm({ title: "", start: `${localKey(new Date())}T09:00`, end: "", notes: "", color: "coral" });
    setShowForm(false);
    await onRefresh();
    onNotify("Evento salvo no seu calendário local.");
  }

  return (
    <div className="page calendar-page">
      <div className="page-heading calendar-heading">
        <div>
          <span className="eyebrow">AGENDA PESSOAL LOCAL</span>
          <h1>Seu tempo também é uma prioridade.</h1>
          <p>Eventos, tarefas e conquistas ficam no Fifones — sem enviar sua rotina para outro lugar.</p>
        </div>
        <button className="primary-button" onClick={() => setShowForm((current) => !current)}>
          <CalendarPlus size={17} /> {showForm ? "Fechar" : "Novo evento"}
        </button>
      </div>

      <section className="progress-panel">
        <div className="progress-level"><Trophy size={22} /><span>Nível {data.gamification.level}</span></div>
        <div className="progress-track">
          <div><i style={{ width: `${data.gamification.xpIntoLevel}%` }} /></div>
          <small>{data.gamification.xpIntoLevel} / {data.gamification.xpForNextLevel} XP para o próximo nível</small>
        </div>
        <div className="progress-stat"><Flame size={20} /><strong>{data.gamification.currentStreak}</strong><span>dias em sequência</span></div>
        <div className="progress-stat"><CheckCircle2 size={20} /><strong>{data.gamification.completedToday}</strong><span>concluídas hoje</span></div>
      </section>

      {showForm && (
        <form className="calendar-form" onSubmit={(event) => void save(event)}>
          <label>O que vai acontecer?<input required autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Treino, consulta ou tempo para mim" /></label>
          <label>Começa em<input required type="datetime-local" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} /></label>
          <label>Termina em<input type="datetime-local" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} /></label>
          <label>Cor<select value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value as typeof form.color })}>{COLORS.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}</select></label>
          <label className="calendar-notes">Detalhes (opcional)<input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="O que você precisa lembrar?" /></label>
          <button className="primary-button">Salvar na agenda</button>
        </form>
      )}

      <section className="week-calendar" aria-label="Próximos sete dias">
        {days.map((day) => {
          const key = localKey(day);
          const events = data.calendarEvents.filter((item) => localKey(item.start) === key);
          const tasks = data.tasks.filter((item) => item.status === "pending" && item.dueAt && localKey(item.dueAt) === key);
          return (
            <article className={`calendar-day ${key === localKey(new Date()) ? "today" : ""}`} key={key}>
              <header><span>{weekdayLabel(day)}</span><strong>{day.getDate()}</strong></header>
              <div className="calendar-day-items">
                {events.map((item) => (
                  <div className={`calendar-event ${item.color}`} key={item.id} title={item.notes}>
                    <Clock3 size={13} /><span>{timeLabel(item.start)} · {item.title}</span>
                    <button aria-label={`Excluir ${item.title}`} onClick={() => void window.eco.deleteCalendarEvent(item.id).then(onRefresh)}><Trash2 size={13} /></button>
                  </div>
                ))}
                {tasks.map((item) => <div className="calendar-task" key={item.id}><CheckCircle2 size={13} /><span>{timeLabel(item.dueAt!)} · {item.title}</span></div>)}
                {events.length + tasks.length === 0 && <small>Livre por enquanto</small>}
              </div>
            </article>
          );
        })}
      </section>
      <p className="calendar-footnote">Completar tarefas rende 10 XP (baixa), 15 XP (normal) ou 25 XP (alta). A sequência conta os dias em que você concluiu pelo menos uma tarefa — sem punição.</p>
    </div>
  );
}
