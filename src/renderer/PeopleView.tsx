import { Plus, Trash2, UsersRound, X } from "lucide-react";
import { useState } from "react";
import type { BootstrapData, PersonInput } from "../shared/types";

const EMPTY: PersonInput = {
  name: "",
  relationship: "",
  context: "",
  confirmedFacts: "",
  openLoops: ""
};

export function PeopleView({
  data,
  onRefresh,
  onNotify
}: {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  onNotify: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PersonInput>(EMPTY);

  return (
    <div className="people-view">
      <header className="people-hero">
        <div>
          <span className="eyebrow">MAPA DE PESSOAS</span>
          <h1>Quem faz parte da sua história.</h1>
          <p>Contexto confirmado por você. O Fifones não inventa relações nem mistura pessoas.</p>
        </div>
        <button className="primary-button" onClick={() => setEditing(true)}><Plus size={17} /> Adicionar pessoa</button>
      </header>
      <section className="people-grid">
        {data.people.map((person) => (
          <article className="person-card" key={person.id}>
            <div className="person-avatar"><UsersRound size={22} /></div>
            <span>{person.relationship || "Relação não definida"}</span>
            <h2>{person.name}</h2>
            <p>{person.context || "Sem contexto confirmado ainda."}</p>
            {person.confirmedFacts && (
              <blockquote className="confirmed-facts">
                <strong>Fatos confirmados</strong>
                {person.confirmedFacts}
              </blockquote>
            )}
            {person.openLoops && <blockquote><strong>Assunto pendente</strong>{person.openLoops}</blockquote>}
            <button onClick={async () => {
              await window.eco.deletePerson(person.id);
              await onRefresh();
            }}><Trash2 size={15} /> Remover</button>
          </article>
        ))}
        {data.people.length === 0 && (
          <div className="people-empty">
            <UsersRound size={34} />
            <h2>Seu mapa começa pela primeira pessoa.</h2>
            <p>Cadastre apenas o que você quiser que o Fifones use como contexto.</p>
          </div>
        )}
      </section>
      {editing && (
        <div className="modal-backdrop">
          <form className="memory-modal person-modal" onSubmit={async (event) => {
            event.preventDefault();
            if (!form.name.trim()) return;
            await window.eco.savePerson(form);
            setForm(EMPTY);
            setEditing(false);
            await onRefresh();
            onNotify("Pessoa adicionada ao seu mapa.");
          }}>
            <div className="modal-head"><div><span className="eyebrow">CONTEXTO CONFIRMADO</span><h2>Adicionar pessoa</h2></div><button type="button" onClick={() => setEditing(false)}><X size={18} /></button></div>
            <label>Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Relação<input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="Família, amigo, trabalho..." /></label>
            <label>Contexto<textarea value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} /></label>
            <label>Fatos confirmados<textarea value={form.confirmedFacts} onChange={(e) => setForm({ ...form, confirmedFacts: e.target.value })} placeholder="O que você sabe e quer que o Fifones considere como fato" /></label>
            <label>Assuntos pendentes<textarea value={form.openLoops} onChange={(e) => setForm({ ...form, openLoops: e.target.value })} /></label>
            <button className="primary-button" type="submit">Salvar no mapa</button>
          </form>
        </div>
      )}
    </div>
  );
}
