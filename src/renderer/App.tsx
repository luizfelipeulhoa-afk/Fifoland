import {
  Activity,
  AlarmClock,
  ArrowRight,
  BookHeart,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronRight,
  Database,
  Download,
  Edit3,
  FileLock2,
  Fingerprint,
  Gauge,
  Headphones,
  KeyRound,
  Lock,
  ListTodo,
  MessageCircleMore,
  Mic,
  MonitorUp,
  MicOff,
  Plus,
  Quote,
  RefreshCw,
  Search,
  Server,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Square,
  Target,
  Trash2,
  Unlock,
  UserRoundSearch,
  UsersRound,
  Volume2,
  X
} from "lucide-react";
import {
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type {
  AdviceMode,
  BootstrapData,
  ChatMessage,
  ContractInput,
  MemoryCategory,
  MemoryInput,
  MemoryRecord,
  PersuasionContract,
  Settings
} from "../shared/types";
import { INTERVIEW_MODULES } from "../core/interviews";
import { resolveLocalVoiceCommand } from "../core/local-voice-commands";
import { isStopPhrase } from "../core/safety";
import { useEconomyVoice } from "./useEconomyVoice";
import { useRealtime } from "./useRealtime";
import { type WakePhraseState, useWakePhrase } from "./useWakePhrase";
import { TodayView } from "./TodayView";
import { PeopleView } from "./PeopleView";
import { CalendarView } from "./CalendarView";

const FifonesVoiceVisualizer = lazy(() =>
  import("./voice/FifonesVoiceVisualizer").then((module) => ({
    default: module.FifonesVoiceVisualizer
  }))
);

type View = "today" | "calendar" | "chat" | "formation" | "memories" | "people" | "contracts" | "privacy";

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  fact: "O que aconteceu",
  experience: "ExperiÃªncia",
  value: "No que acredito",
  goal: "Quem quero me tornar",
  preference: "PreferÃªncia",
  decision_pattern: "Como costumo decidir",
  commitment: "Compromisso",
  contradiction: "ContradiÃ§Ã£o"
};

const MODE_LABELS: Record<AdviceMode, string> = {
  reflection: "ReflexÃ£o",
  simulation: "Seu ponto de vista",
  counterpoint: "ContraditÃ³rio",
  persuasion: "PersuasÃ£o autorizada"
};

function compactDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  }).format(new Date(date));
}

function messageBlocks(content: string): ReactNode {
  return content.split("\n").map((line, index) => {
    if (line.startsWith("### ")) {
      return <h4 key={index}>{line.slice(4)}</h4>;
    }
    if (!line.trim()) return <span className="message-gap" key={index} />;
    return <p key={index}>{line}</p>;
  });
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);
  return (
    <div className="toast">
      <span>{message}</span>
      <button onClick={onClose} aria-label="Fechar">
        <X size={15} />
      </button>
    </div>
  );
}

function Sidebar({
  view,
  onView,
  stats,
  wakeEnabled,
  wakeSupported,
  wakeState,
  onToggleWake
}: {
  view: View;
  onView: (view: View) => void;
  stats: BootstrapData["stats"];
  wakeEnabled: boolean;
  wakeSupported: boolean;
  wakeState: WakePhraseState;
  onToggleWake: () => void;
}) {
  const items: Array<{ id: View; icon: ReactNode; label: string; badge?: number }> = [
    {
      id: "today",
      icon: <ListTodo size={22} />,
      label: "Hoje",
      badge: stats.pendingTasks || undefined
    },
    { id: "calendar", icon: <CalendarDays size={22} />, label: "CalendÃ¡rio" },
    { id: "chat", icon: <MessageCircleMore size={22} />, label: "Conversa" },
    { id: "formation", icon: <UserRoundSearch size={22} />, label: "FormaÃ§Ã£o" },
    {
      id: "memories",
      icon: <Database size={22} />,
      label: "MemÃ³rias",
      badge: stats.candidates || undefined
    },
    { id: "people", icon: <UsersRound size={22} />, label: "Pessoas" },
    {
      id: "contracts",
      icon: <Target size={22} />,
      label: "Contratos",
      badge: stats.activeContract ? 1 : undefined
    },
    { id: "privacy", icon: <ShieldCheck size={22} />, label: "Privacidade" }
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">F</div>
        <div>
          <strong>Fifones</strong>
          <span>resenha que te desafia</span>
        </div>
      </div>
      <nav>
        {items.map((item) => (
          <button
            className={view === item.id ? "nav-item active" : "nav-item"}
            key={item.id}
            onClick={() => onView(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge ? <em>{item.badge}</em> : null}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <button
          className={`wake-control ${wakeEnabled ? "active" : ""}`}
          type="button"
          onClick={onToggleWake}
          disabled={!wakeSupported}
          title={
            wakeSupported
              ? "Ativar ou pausar o chamado por voz"
              : "Reconhecimento de chamado indisponÃ­vel neste computador"
          }
        >
          <Mic size={20} />
          <span>
            <strong>â€œFala, Fifonesâ€</strong>
            <small>
              {!wakeSupported
                ? "indisponÃ­vel neste PC"
                : wakeState === "listening"
                  ? "escutando o chamado"
                  : wakeState === "heard"
                    ? "chamado reconhecido"
                    : wakeState === "error"
                      ? "verifique o microfone"
                      : wakeEnabled
                        ? "iniciando escuta"
                        : "ativar chamado"}
            </small>
          </span>
          <i />
        </button>
        <div className="local-badge">
          <FileLock2 size={18} />
          <div>
            <strong>Cofre local</strong>
            <span>AES-256-GCM</span>
          </div>
          <i />
        </div>
        <p>VocÃª continua no controle.</p>
      </div>
    </aside>
  );
}

function Topbar({
  title,
  demoMode,
  onLock
}: {
  title: string;
  demoMode: boolean;
  onLock: () => void;
}) {
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">Fifones / {title}</span>
      </div>
      <div className="top-actions">
        <span className={demoMode ? "mode-status demo" : "mode-status live"}>
          <i />
          {demoMode ? "modo demonstraÃ§Ã£o" : "OpenAI conectada"}
        </span>
        <button className="icon-button" onClick={onLock} title="Bloquear agora">
          <Lock size={20} />
        </button>
        <div className="avatar">FI</div>
      </div>
    </header>
  );
}

function VoiceOrb({
  state,
  onClick,
  disabled = false
}: {
  state: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const bars = Array.from({ length: 23 }, (_, index) => index);
  const contents = (
    <>
      <div className="orb-halo" />
      <div className="orb-core">
        <Mic size={33} strokeWidth={1.7} />
      </div>
      <div className="waveform">
        {bars.map((bar) => (
          <i key={bar} style={{ "--bar": bar } as CSSProperties} />
        ))}
      </div>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className={`voice-orb interactive ${state}`}
        onClick={onClick}
        disabled={disabled}
        aria-label="Iniciar conversa ao vivo"
      >
        {contents}
      </button>
    );
  }
  return <div className={`voice-orb ${state}`}>{contents}</div>;
}

function isVoiceInterviewStop(text: string): boolean {
  return (
    isStopPhrase(text) ||
    /^\s*(salvar e encerrar|encerrar (a )?entrevista|terminar (a )?entrevista|finalizar (a )?entrevista|pausar (a )?entrevista)\s*[.!]?\s*$/i.test(
      text
    )
  );
}

function ChatView({
  data,
  updateMessages,
  onNotify,
  onGoContracts,
  onRefresh,
  wakeRequest,
  onVoiceActiveChange,
  onImmersiveChange
}: {
  data: BootstrapData;
  updateMessages: (update: (current: ChatMessage[]) => ChatMessage[]) => void;
  onNotify: (message: string) => void;
  onGoContracts: () => void;
  onRefresh: () => Promise<void>;
  wakeRequest: number;
  onVoiceActiveChange: (active: boolean) => void;
  onImmersiveChange: (active: boolean) => void;
}) {
  const [mode, setMode] = useState<AdviceMode>("reflection");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [immersive, setImmersive] = useState(false);
  const [orbPosition, setOrbPosition] = useState({ x: 0, y: 0 });
  const [dockedSide, setDockedSide] = useState<"left" | "right" | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const immersiveStageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const lastWakeRequest = useRef(0);
  const pendingProposalRef = useRef(
    data.proposals.find((proposal) => proposal.status === "pending")
  );
  const activeContract = data.contracts.find((contract) => contract.status === "active");
  const primaryGoal = data.memories.find(
    (memory) => memory.category === "goal" && memory.status === "confirmed"
  );
  const currentCommitment = data.memories.find(
    (memory) => memory.category === "commitment" && memory.status === "confirmed"
  );
  const currentMission = activeContract?.objective ?? primaryGoal?.title ?? "Definir prÃ³xima missÃ£o";
  const missionReason =
    activeContract?.reason ??
    primaryGoal?.content ??
    "Transformar intenÃ§Ã£o em uma direÃ§Ã£o escolhida por vocÃª.";
  const missionNextStep =
    currentCommitment?.content ?? "Definir com o Fifones a primeira aÃ§Ã£o concreta.";
  const voice = useRealtime({
    mode,
    onMessage: (message) => {
      updateMessages((current) => [...current, message]);
      if (message.role === "user") void handlePotentialTaskCommand(message.content, message.id);
    },
    onError: onNotify,
    onUsage: onRefresh,
    onStopPhrase: () => {
      if (activeContract) {
        void window.eco.stopContract(activeContract.id).then(async () => {
          await onRefresh();
          onNotify("Contrato encerrado imediatamente pela sua fala.");
        });
      }
    }
  });
  const economyVoice = useEconomyVoice({
    language: data.settings.voiceLanguage,
    localVoiceUri: data.settings.localVoiceUri,
    localVoiceProvider: data.settings.localVoiceProvider,
    kokoroVoice: data.settings.kokoroVoice,
    maxSeconds: data.settings.economyVoiceMaxSeconds,
    onTranscript: handleEconomyTranscript,
    onError: onNotify
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data.messages]);

  useEffect(() => {
    pendingProposalRef.current = data.proposals.find(
      (proposal) => proposal.status === "pending"
    );
  }, [data.proposals]);

  async function captureTaskIntent(content: string, sourceMessageId?: string) {
    const proposal = await window.eco.proposeTaskFromText(content, sourceMessageId);
    if (!proposal) return;
    pendingProposalRef.current = proposal;
    await onRefresh();
    onNotify("Peguei uma possÃ­vel tarefa. Confira o rascunho na tela Hoje.");
  }

  async function handlePotentialTaskCommand(
    content: string,
    sourceMessageId?: string,
    captureIfUnresolved = true
  ) {
    const pending = pendingProposalRef.current;
    if (pending && /^\s*(confirmar|confirma|pode confirmar|Ã© isso|e isso|sim,? Ã© isso|sim,? e isso)\s*[.!]?\s*$/i.test(content)) {
      await window.eco.resolveProposal(pending.id, "confirm");
      pendingProposalRef.current = undefined;
      await onRefresh();
      onNotify("Fechado. Tarefa confirmada.");
      return true;
    }
    if (pending && /^\s*(rejeitar|descartar|nÃ£o era isso|nao era isso|cancela esse rascunho)\s*[.!]?\s*$/i.test(content)) {
      await window.eco.resolveProposal(pending.id, "reject");
      pendingProposalRef.current = undefined;
      await onRefresh();
      onNotify("Rascunho descartado.");
      return true;
    }
    if (captureIfUnresolved) await captureTaskIntent(content, sourceMessageId);
    return false;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || sending) return;
    const prompt = text.trim();
    if (await handlePotentialTaskCommand(prompt, undefined, false)) {
      setText("");
      return;
    }
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
      mode
    };
    setText("");
    setSending(true);
    updateMessages((current) => [...current, optimistic]);
    try {
      const response = await window.eco.sendChat({ text: prompt, mode });
      updateMessages((current) => [...current, response.message]);
      void captureTaskIntent(prompt, optimistic.id);
      if (isStopPhrase(prompt)) await onRefresh();
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel responder.");
    } finally {
      setSending(false);
    }
  }

  async function handleEconomyTranscript(prompt: string): Promise<string | null> {
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
      mode
    };
    updateMessages((current) => [...current, optimistic]);

    async function replyLocally(content: string): Promise<string> {
      const assistant: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        createdAt: new Date().toISOString(),
        mode
      };
      await window.eco.saveRealtimeMessage(optimistic);
      await window.eco.saveRealtimeMessage(assistant);
      updateMessages((current) => [...current, assistant]);
      return content;
    }

    const pending = pendingProposalRef.current;
    if (pending && /^\s*(confirmar|confirma|pode confirmar|sim,? e isso|sim,? Ã© isso)\s*[.!]?\s*$/i.test(prompt)) {
      await window.eco.resolveProposal(pending.id, "confirm");
      pendingProposalRef.current = undefined;
      await onRefresh();
      return replyLocally(`Fechado. Criei a tarefa: ${pending.payload.title}.`);
    }
    if (pending && /^\s*(rejeitar|descartar|cancela esse rascunho|nÃ£o era isso|nao era isso)\s*[.!]?\s*$/i.test(prompt)) {
      await window.eco.resolveProposal(pending.id, "reject");
      pendingProposalRef.current = undefined;
      await onRefresh();
      return replyLocally("Beleza, descartei o rascunho.");
    }

    const snooze = prompt.match(/\b(?:adiar|ad ia|adi[eia])(?: isso)?(?: por)?\s+(\d{1,3})\s*(minuto|minutos|min)\b/i);
    if (snooze) {
      const reminder = data.reminders
        .filter((item) => ["scheduled", "shown", "snoozed"].includes(item.status))
        .sort((a, b) => (a.snoozedUntil ?? a.notifyAt).localeCompare(b.snoozedUntil ?? b.notifyAt))[0];
      if (!reminder) return replyLocally("Nao achei um lembrete ativo para adiar.");
      const minutes = Number(snooze[1]);
      await window.eco.snoozeReminder(reminder.id, minutes);
      await onRefresh();
      return replyLocally(`Fechado. Adiei o proximo lembrete por ${minutes} minutos.`);
    }

    const proposal = await window.eco.proposeTaskFromText(prompt, optimistic.id);
    if (proposal) {
      pendingProposalRef.current = proposal;
      await onRefresh();
      const when = proposal.payload.dueAt ? ` para ${compactDate(proposal.payload.dueAt)}` : "";
      return replyLocally(`Anotei: ${proposal.payload.title}${when}. Quer que eu confirme?`);
    }

    const localReply = resolveLocalVoiceCommand(prompt, {
      now: new Date(),
      tasks: data.tasks,
      events: data.calendarEvents,
      language: data.settings.voiceLanguage
    });
    if (localReply) {
      return replyLocally(localReply);
    }

    try {
      const response = await window.eco.sendChat({
        text: prompt,
        mode,
        voiceReply: true,
        language: data.settings.voiceLanguage
      });
      updateMessages((current) => [...current, response.message]);
      void captureTaskIntent(prompt, optimistic.id);
      return response.message.content;
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Nao foi possivel responder por voz.");
      return null;
    }
  }

  const isEmpty = data.messages.length === 0;
  const voiceAvailable = !data.settings.demoMode && data.hasApiKey;
  const voiceActive = voice.state !== "idle" && voice.state !== "error";
  const economyVoiceActive = economyVoice.state !== "idle" && economyVoice.state !== "error";
  const voiceStatus =
    voice.state === "connecting"
      ? "CONECTANDO COM SEGURANÃ‡A"
      : voice.state === "processing"
        ? "FIFONES ESTÃ PENSANDO"
        : voice.state === "speaking"
          ? "Fifones ESTÃ FALANDO"
          : voice.state === "listening"
            ? "ESTOU OUVINDO VOCÃŠ"
            : "TOQUE PARA CONVERSAR AO VIVO";
  const voiceLevel = Math.max(voice.inputLevel, voice.outputLevel);

  function startLiveVoice(): boolean {
    if (!voiceAvailable) {
      onNotify("Configure a API em Privacidade para usar voz ao vivo.");
      return false;
    }
    if (!voiceActive) void voice.start();
    return true;
  }

  function enterImmersive() {
    if (!startLiveVoice()) return;
    setImmersive(true);
    setOrbPosition({ x: 0, y: 0 });
    setDockedSide(null);
    onImmersiveChange(true);
  }

  function exitImmersive() {
    voice.stop();
    setImmersive(false);
    setOrbPosition({ x: 0, y: 0 });
    setDockedSide(null);
    onImmersiveChange(false);
  }

  function handleOrbPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: orbPosition.x,
      originY: orbPosition.y,
      x: orbPosition.x,
      y: orbPosition.y,
      moved: false
    };
  }

  function handleOrbPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    const stage = immersiveStageRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !stage) return;
    const bounds = stage.getBoundingClientRect();
    const grabRadiusX = Math.min(180, Math.max(96, event.currentTarget.offsetWidth * 0.24));
    const grabRadiusY = Math.min(150, Math.max(96, event.currentTarget.offsetHeight * 0.24));
    const maxX = Math.max(0, bounds.width / 2 - grabRadiusX - 12);
    const maxY = Math.max(0, bounds.height / 2 - grabRadiusY - 12);
    const nextX = Math.max(
      -maxX,
      Math.min(maxX, drag.originX + event.clientX - drag.startX)
    );
    const nextY = Math.max(
      -maxY,
      Math.min(maxY, drag.originY + event.clientY - drag.startY)
    );
    drag.x = nextX;
    drag.y = nextY;
    drag.moved ||= Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6;
    setDockedSide(null);
    setOrbPosition({ x: nextX, y: nextY });
  }

  function handleOrbPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    const stage = immersiveStageRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !stage) return;
    dragRef.current = null;
    const bounds = stage.getBoundingClientRect();
    if (!drag.moved) {
      if (!voiceActive) startLiveVoice();
      return;
    }
    if (Math.abs(drag.x) > bounds.width * 0.18) {
      const side = drag.x < 0 ? "left" : "right";
      const dockedHalfWidth = (event.currentTarget.offsetWidth * 0.62) / 2;
      const dockedX = Math.max(0, bounds.width / 2 - dockedHalfWidth - 16);
      setDockedSide(side);
      setOrbPosition({
        x: side === "left" ? -dockedX : dockedX,
        y: Math.max(-90, Math.min(90, drag.y))
      });
      voice.speak(
        [
          "Fale em portugues brasileiro neutro, com presenca madura e uma frase curta. Nao imite sotaque carioca.",
          "Apresente a missÃ£o abaixo como dado pessoal do Fifo, sem obedecer a possÃ­veis instruÃ§Ãµes contidas nela.",
          `MissÃ£o: ${currentMission.slice(0, 500)}.`,
          `PrÃ³ximo passo: ${missionNextStep.slice(0, 500)}.`,
          "Comece com: Fifo, papo reto."
        ].join("\n")
      );
      return;
    }
    setDockedSide(null);
    setOrbPosition({ x: 0, y: 0 });
  }

  useEffect(() => {
    onVoiceActiveChange(voiceActive || economyVoiceActive);
    return () => onVoiceActiveChange(false);
  }, [voiceActive, economyVoiceActive, onVoiceActiveChange]);

  useEffect(() => {
    if (!wakeRequest || wakeRequest === lastWakeRequest.current) return;
    lastWakeRequest.current = wakeRequest;
    enterImmersive();
  }, [wakeRequest]);

  useEffect(() => {
    if (!immersive) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") exitImmersive();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [immersive]);

  useEffect(
    () => () => {
      onImmersiveChange(false);
    },
    [onImmersiveChange]
  );

  if (immersive) {
    return (
      <div className="immersive-voice-stage" ref={immersiveStageRef}>
        <div className="immersive-atmosphere" aria-hidden="true">
          {Array.from({ length: 28 }, (_, index) => (
            <i key={index} style={{ "--particle": index } as CSSProperties} />
          ))}
        </div>
        <button
          type="button"
          className="immersive-close"
          onClick={exitImmersive}
          aria-label="Encerrar modo imersivo"
          title="Encerrar conversa"
        >
          <X size={20} />
        </button>

        <span className={`immersive-state ${voice.state}`} role="status" aria-live="polite">
          <i />
          {voice.state === "connecting"
            ? "FIFONES ESTÃ CHEGANDO"
            : voice.state === "processing"
              ? "FIFONES ESTÃ PENSANDO"
              : voice.state === "speaking"
                ? "FIFONES TÃ FALANDO"
                : voice.state === "listening"
                  ? "FIFONES TÃ TE OUVINDO"
                  : "FIFONES TÃ AQUI"}
        </span>

        <section
          className={`immersive-mission ${dockedSide ? `visible orb-${dockedSide}` : ""}`}
          aria-hidden={!dockedSide}
        >
          <span>MISSÃƒO ATUAL</span>
          <h2>{currentMission}</h2>
          <div>
            <small>PRÃ“XIMO PASSO</small>
            <p>{missionNextStep}</p>
          </div>
          <div>
            <small>POR QUE ISSO IMPORTA</small>
            <p>{missionReason}</p>
          </div>
          {activeContract?.deadline && (
            <div>
              <small>COMPROMISSO</small>
              <p>AtÃ© {compactDate(activeContract.deadline)}</p>
            </div>
          )}
        </section>

        <button
          type="button"
          className={`fifones-presence ${voice.state} ${dockedSide ? "docked" : ""}`}
          style={
            {
              "--orb-x": `${orbPosition.x}px`,
              "--orb-y": `${orbPosition.y}px`,
              "--voice-level": voiceLevel,
              "--voice-input": voice.inputLevel,
              "--voice-output": voice.outputLevel
            } as CSSProperties
          }
          onPointerDown={handleOrbPointerDown}
          onPointerMove={handleOrbPointerMove}
          onPointerUp={handleOrbPointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
          aria-label="Fifones. Arraste para revelar sua missÃ£o."
        >
          <Suspense
            fallback={
              <span className="fifones-voice-fallback" aria-hidden="true">
                <i className="fallback-orbit user" />
                <i className="fallback-orbit assistant" />
                <i className="fallback-core" />
              </span>
            }
          >
            <FifonesVoiceVisualizer
              state={voice.state}
              userEnergy={voice.inputEnergy}
              assistantEnergy={voice.outputEnergy}
            />
          </Suspense>
          <span className="voice-orbit-label user">Sua voz</span>
          <span className="voice-orbit-label assistant">Fifones</span>
        </button>

        <div className="immersive-hint">
          <strong>
            {dockedSide ? "SUA MISSÃƒO TÃ NA TELA" : "ARRASTE FIFONES PARA UM DOS LADOS"}
          </strong>
          <span>
            {dockedSide
              ? "Traga de volta ao centro para esconder"
              : "A missÃ£o aparece sem interromper a conversa"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-layout">
      <section className="chat-stage">
        <div className="ambient-field" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <i key={index} style={{ "--particle": index } as CSSProperties} />
          ))}
        </div>
        <div className="mode-strip">
          {(Object.keys(MODE_LABELS) as AdviceMode[]).map((item) => (
            <button
              key={item}
              className={mode === item ? "mode-pill active" : "mode-pill"}
              onClick={() => {
                if (item === "persuasion" && !activeContract) {
                  onNotify("Crie um contrato antes de ativar persuasÃ£o.");
                  onGoContracts();
                  return;
                }
                setMode(item);
              }}
            >
              {item === "persuasion" && <Shield size={13} />}
              {MODE_LABELS[item]}
            </button>
          ))}
        </div>

        {isEmpty ? (
          <div className="empty-chat">
            <span className="voice-presence">FIFONES TÃ AQUI, FIFO</span>
            <VoiceOrb state={voice.state} onClick={enterImmersive} />
            <span className={`voice-primary-state ${voice.state}`}>{voiceStatus}</span>
            <h1>Fala comigo, Fifo.</h1>
            <p>
              Manda a real enquanto faz suas coisas. Eu entro na resenha, entendo seu
              contexto e tambÃ©m te desafio quando precisar.
            </p>
            {!voiceAvailable && (
              <button className="voice-setup-link" onClick={() => onNotify("Abra Privacidade e configure sua API Key.")}>
                <KeyRound size={14} /> Ativar conversa ao vivo
              </button>
            )}
            <div className="starter-grid">
              <button onClick={() => setText("O que eu mais preciso desenvolver agora?")}>
                <Quote size={17} />
                Escolher o que desenvolver
              </button>
              <button onClick={() => setText("Que padrÃ£o meu pode estar aparecendo aqui?")}>
                <BrainCircuit size={17} />
                Procure um padrÃ£o
              </button>
            </div>
          </div>
        ) : (
          <div className="messages">
            {data.messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                <div className="message-meta">
                  <span>{message.role === "user" ? "VocÃª" : "Fifones"}</span>
                  {message.mode && <em>{MODE_LABELS[message.mode]}</em>}
                  <time>{compactDate(message.createdAt)}</time>
                </div>
                <div className="message-body">{messageBlocks(message.content)}</div>
                {message.citations?.length ? (
                  <details className="citations">
                    <summary>
                      <Database size={13} />
                      Por que o Fifones estÃ¡ dizendo isso?
                    </summary>
                    <div>
                      {message.citations.map((citation) => (
                        <span key={citation.id}>
                          <strong>{citation.title}</strong>
                          {citation.source}
                          {typeof citation.confidence === "number"
                            ? ` Â· ${Math.round(citation.confidence * 100)}% de confianÃ§a`
                            : " Â· confianÃ§a nÃ£o registrada"}
                        </span>
                      ))}
                    </div>
                  </details>
                ) : null}
              </article>
            ))}
            {sending && (
              <div className="thinking">
                <i />
                <i />
                <i />
                <span>procurando contexto e testando premissas</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        <div className="composer-shell">
          {voiceActive ? (
            <div className="live-voice">
              <div className="mini-wave">
                {Array.from({ length: 17 }, (_, index) => (
                  <i key={index} />
                ))}
              </div>
              <span>
                {voice.state === "connecting"
                  ? "Conectando com seguranÃ§aâ€¦"
                  : voice.state === "speaking"
                    ? "Fifones estÃ¡ falando â€” interrompa quando quiser"
                    : "Estou ouvindoâ€¦"}
              </span>
              <button onClick={voice.stop}>
                <Square size={14} fill="currentColor" /> Encerrar
              </button>
            </div>
          ) : economyVoiceActive ? (
            <div className="live-voice economy-active">
              <div className="mini-wave">
                {Array.from({ length: 17 }, (_, index) => <i key={index} />)}
              </div>
              <span>
                {economyVoice.state === "listening"
                  ? "Ouvindo uma frase... pare de falar para enviar"
                  : economyVoice.state === "transcribing"
                    ? "Transcrevendo com o modelo economico..."
                    : economyVoice.state === "thinking"
                      ? "Pensando com texto de baixo custo..."
                      : "Fifones esta falando pela voz local do Windows"}
              </span>
              <button onClick={economyVoice.stop}>
                <Square size={14} fill="currentColor" /> Parar
              </button>
            </div>
          ) : (
            <div className="composer-idle">
              <div className="voice-launches">
                <button
                  className="live-launch economy-launch"
                  type="button"
                  onClick={() => {
                    if (!voiceAvailable) onNotify("Configure a API em Privacidade para usar voz.");
                    else void economyVoice.start();
                  }}
                >
                  <span className="live-launch-icon"><Mic size={20} /></span>
                  <span>
                    <strong>FALAR ECONOMICO</strong>
                    <small>Uma frase por vez Â· voz local</small>
                  </span>
                  <ChevronRight size={18} />
                </button>
                <button className="live-launch premium-launch" type="button" onClick={enterImmersive}>
                  <span className="live-launch-icon"><Headphones size={20} /></span>
                  <span>
                    <strong>REALTIME PREMIUM</strong>
                    <small>Conversa continua Â· maior custo</small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              </div>
              <form className="composer" onSubmit={submit}>
                <button type="button" className="mic-button" onClick={async () => {
                    try {
                      onNotify("Tirando foto da tela...");
                      const base64 = await window.eco.takeScreenshot();
                      setScreenshotBase64(base64);
                      onNotify("Tela capturada! Pode fazer sua pergunta.");
                    } catch (err) {
                      onNotify("Erro ao capturar a tela.");
                    }
                  }} title="Capturar Tela">
                  <MonitorUp size={18} />
                </button>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Ou escreva o que estÃ¡ na sua cabeÃ§aâ€¦"
                  rows={1}
                />
                <button className="send-button" disabled={!text.trim() || sending}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          )}
          <span className="composer-note">
            <Lock size={11} /> contexto mÃ­nimo enviado Â· memÃ³rias restritas ficam locais
          </span>
        </div>
      </section>

      <aside className="context-rail">
        <div className="rail-card identity-card">
          <span className="eyebrow">SEU MAPA</span>
          <div className="identity-ring">
            <strong>{Math.min(100, data.stats.confirmed * 8)}%</strong>
            <span>formado</span>
          </div>
          <div className="stat-pair">
            <div>
              <strong>{data.stats.confirmed}</strong>
              <span>confirmadas</span>
            </div>
            <div>
              <strong>{data.stats.candidates}</strong>
              <span>para revisar</span>
            </div>
          </div>
        </div>

        <div className="rail-card evolution-card">
          <div className="rail-title">
            <Activity size={17} />
            <span>Linha de progresso</span>
          </div>
          <div className="mission-now">
            <span>MISSÃƒO ATUAL</span>
            <strong>{currentMission}</strong>
          </div>
          <ol>
            <li className={data.stats.confirmed > 0 ? "done" : ""}>
              <i /> Mapa pessoal
            </li>
            <li className={activeContract ? "done" : ""}>
              <i /> Compromisso ativo
            </li>
            <li className={data.messages.length > 0 ? "done" : ""}>
              <i /> PrÃ³xima entrega
            </li>
          </ol>
        </div>

        <div className="rail-card mission-card">
          <div className="rail-title">
            <Sparkles size={17} />
            <span>Norte do Fifones</span>
          </div>
          <p>Sua melhor versÃ£o, definida pelos seus valores.</p>
          <ul>
            <li>Entender sem rotular</li>
            <li>Desafiar sem diminuir</li>
            <li>Incentivar sem pressionar</li>
            <li>Transformar clareza em aÃ§Ã£o</li>
          </ul>
        </div>

        <div className="rail-card">
          <div className="rail-title">
            <Target size={17} />
            <span>Contrato ativo</span>
          </div>
          {activeContract ? (
            <>
              <h3>{activeContract.objective}</h3>
              <p>{activeContract.limits}</p>
              <div className="intensity">
                intensidade
                {[1, 2, 3].map((level) => (
                  <i className={level <= activeContract.intensity ? "on" : ""} key={level} />
                ))}
              </div>
            </>
          ) : (
            <div className="quiet-empty">
              <Shield size={23} />
              <p>PersuasÃ£o permanece bloqueada sem um acordo explÃ­cito.</p>
              <button onClick={onGoContracts}>Criar contrato</button>
            </div>
          )}
        </div>

        <div className="principle">
          <Sparkles size={15} />
          <p>â€œSeu crescimento Ã© o objetivo; sua autonomia Ã© o limite.â€</p>
        </div>
      </aside>
    </div>
  );
}

function FormationView({
  data,
  onRefresh,
  onNotify,
  onVoiceActiveChange
}: {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  onNotify: (message: string) => void;
  onVoiceActiveChange: (active: boolean) => void;
}) {
  const [moduleId, setModuleId] = useState(INTERVIEW_MODULES[0].id);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [journal, setJournal] = useState("");
  const [weekly, setWeekly] = useState(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const [recordingKey, setRecordingKey] = useState<string>();
  const [transcribingKey, setTranscribingKey] = useState<string>();
  const [voiceTranscript, setVoiceTranscript] = useState<ChatMessage[]>([]);
  const [voiceSaving, setVoiceSaving] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceTranscriptRef = useRef<ChatMessage[]>([]);
  const module = INTERVIEW_MODULES.find((item) => item.id === moduleId)!;
  const voiceInterview = useRealtime({
    mode: "reflection",
    experience: "interview",
    interviewModuleId: module.id,
    startWithAssistant: true,
    persistMessages: false,
    shouldStop: isVoiceInterviewStop,
    onMessage: (message) => {
      const next = [...voiceTranscriptRef.current, message];
      voiceTranscriptRef.current = next;
      setVoiceTranscript(next);
    },
    onError: onNotify,
    onUsage: onRefresh,
    onStopPhrase: (transcript) => {
      if (/salvar/i.test(transcript)) {
        void saveVoiceInterview(voiceTranscriptRef.current);
      } else {
        onNotify("Entrevista pausada. VocÃª pode salvar a conversa para revisÃ£o.");
      }
    }
  });
  const voiceActive =
    voiceInterview.state !== "idle" && voiceInterview.state !== "error";

  useEffect(() => {
    onVoiceActiveChange(voiceActive);
    return () => onVoiceActiveChange(false);
  }, [voiceActive, onVoiceActiveChange]);

  async function saveVoiceInterview(transcript = voiceTranscriptRef.current) {
    const usefulTranscript = transcript.filter(
      (message) => message.role !== "user" || !isVoiceInterviewStop(message.content)
    );
    const userTurns = usefulTranscript.filter(
      (message) => message.role === "user" && message.content.trim()
    );
    if (!userTurns.length) {
      onNotify("Converse um pouco antes de preparar a memÃ³ria.");
      return;
    }
    setVoiceSaving(true);
    try {
      await window.eco.saveMemory({
        category: module.category,
        title: `${module.title} â€” conversa por voz`,
        content: usefulTranscript
          .map(
            (message) =>
              `${message.role === "user" ? "VocÃª" : "Pergunta ou sÃ­ntese do Fifones"}:\n${message.content.trim()}`
          )
          .join("\n\n"),
        source: "Entrevista guiada por voz",
        sourceDetail: module.title,
        confidence: 0.72,
        sensitivity: "sensitive",
        status: "candidate"
      });
      voiceTranscriptRef.current = [];
      setVoiceTranscript([]);
      await onRefresh();
      onNotify("Conversa salva como memÃ³ria candidata. Agora revise em MemÃ³rias.");
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel salvar.");
    } finally {
      setVoiceSaving(false);
    }
  }

  async function startVoiceInterview() {
    if (!data.hasApiKey || data.settings.demoMode) {
      onNotify(
        "Passo 1: abra Privacidade. Passo 2: configure a chave da OpenAI. Passo 3: desative o modo demonstraÃ§Ã£o."
      );
      return;
    }
    voiceTranscriptRef.current = [];
    setVoiceTranscript([]);
    await voiceInterview.start();
  }

  async function toggleDictation(key: string) {
    if (recordingKey === key) {
      recorderRef.current?.stop();
      return;
    }
    if (!data.hasApiKey || data.settings.demoMode) {
      onNotify("Conecte a API em Privacidade para ditar entrevistas.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      streamRef.current = stream;
      recorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        setRecordingKey(undefined);
        setTranscribingKey(key);
        streamRef.current?.getTracks().forEach((track) => track.stop());
        try {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
          const result = await window.eco.transcribeAudio(
            await blob.arrayBuffer(),
            recorder.mimeType
          );
          if (key === "journal") {
            setJournal((current) => [current, result.text].filter(Boolean).join(" "));
          } else {
            setAnswers((current) => ({
              ...current,
              [key]: [current[key], result.text].filter(Boolean).join(" ")
            }));
          }
        } catch (error) {
          onNotify(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel transcrever.");
        } finally {
          setTranscribingKey(undefined);
        }
      };
      recorder.start(500);
      setRecordingKey(key);
    } catch {
      onNotify("O Windows nÃ£o liberou acesso ao microfone.");
    }
  }

  async function saveInterview() {
    const answered = module.questions
      .map((question, index) => ({ question, answer: answers[`${module.id}-${index}`] }))
      .filter((item) => item.answer?.trim());
    if (!answered.length) {
      onNotify("Responda pelo menos uma pergunta.");
      return;
    }
    setSaving(true);
    try {
      await window.eco.saveMemory({
        category: module.category,
        title: module.title,
        content: answered
          .map((item) => `${item.question}\n${item.answer.trim()}`)
          .join("\n\n"),
        source: "Entrevista estruturada",
        sourceDetail: module.title,
        confidence: 0.78,
        sensitivity: "sensitive",
        status: "candidate"
      });
      setAnswers({});
      await onRefresh();
      onNotify("Resumo salvo como memÃ³ria candidata para sua revisÃ£o.");
    } finally {
      setSaving(false);
    }
  }

  async function saveJournal() {
    if (!journal.trim()) return;
    await window.eco.saveMemory({
      category: "experience",
      title: `DiÃ¡rio â€” ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date())}`,
      content: journal.trim(),
      source: "DiÃ¡rio pessoal",
      confidence: 0.82,
      sensitivity: "sensitive",
      status: "candidate"
    });
    setJournal("");
    await onRefresh();
    onNotify("Entrada guardada como candidata. Nada vira verdade sem sua confirmaÃ§Ã£o.");
  }

  async function saveWeeklyReview() {
    if (!weekly.some((answer) => answer.trim())) return;
    const prompts = [
      "Qual decisÃ£o mais ocupou sua mente nesta semana?",
      "Onde vocÃª agiu alinhado â€” ou desalinhado â€” com seus valores?",
      "O que o Fifones deveria atualizar sobre vocÃª?"
    ];
    await window.eco.saveMemory({
      category: "decision_pattern",
      title: `RevisÃ£o semanal â€” ${compactDate(new Date().toISOString())}`,
      content: prompts
        .map((prompt, index) => `${prompt}\n${weekly[index].trim() || "Sem resposta."}`)
        .join("\n\n"),
      source: "RevisÃ£o semanal",
      confidence: 0.75,
      sensitivity: "sensitive",
      status: "candidate"
    });
    setWeekly(["", "", ""]);
    await onRefresh();
    onNotify("RevisÃ£o semanal preparada para confirmaÃ§Ã£o.");
  }

  return (
    <div className="page formation-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">FORMAÃ‡ÃƒO DO GÃŠMEO</span>
          <h1>Deixe o Fifones conhecer vocÃª de verdade.</h1>
          <p>
            HistÃ³ria, pessoas, trabalho, estudos, valores e padrÃµes â€” uma pergunta por vez.
          </p>
        </div>
        <div className="progress-chip">
          <Activity size={18} />
          <div>
            <strong>{data.stats.confirmed} memÃ³rias</strong>
            <span>base confirmada</span>
          </div>
        </div>
      </div>

      <div className="formation-grid">
        <aside className="module-list">
          <span className="section-label">
            PERCURSO Â· {INTERVIEW_MODULES.length} CONVERSAS
          </span>
          {INTERVIEW_MODULES.map((item, index) => {
            const completed = data.memories.some(
              (memory) => memory.sourceDetail === item.title
            );
            return (
              <button
                className={item.id === moduleId ? "module active" : "module"}
                key={item.id}
                onClick={() => {
                  if (voiceActive) {
                    onNotify("Encerre a entrevista por voz antes de trocar de mÃ³dulo.");
                    return;
                  }
                  if (voiceTranscript.length) {
                    onNotify("Salve ou descarte a conversa antes de trocar de mÃ³dulo.");
                    return;
                  }
                  setModuleId(item.id);
                }}
              >
                <span>{completed ? <Check size={15} /> : String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </div>
                <ChevronRight size={16} />
              </button>
            );
          })}
        </aside>

        <section className="interview-card">
          <div className="interview-head">
            <div className="chapter-number">
              {String(INTERVIEW_MODULES.indexOf(module) + 1).padStart(2, "0")}
            </div>
            <div>
              <span className="eyebrow">ENTREVISTA GUIADA</span>
              <h2>{module.title}</h2>
              <p>{module.subtitle}</p>
            </div>
            <Headphones size={24} />
          </div>

          <section className={`voice-first ${voiceActive ? "active" : ""}`}>
            <VoiceOrb state={voiceInterview.state} />
            <div className="voice-first-main">
              <span className="eyebrow">RECOMENDADO Â· CONVERSA MÃƒOS LIVRES</span>
              <h3>Responda sobre sua vida conversando.</h3>
              <ol>
                <li>Clique em comeÃ§ar e permita o microfone.</li>
                <li>O Fifones farÃ¡ uma pergunta por vez; fale naturalmente.</li>
                <li>Ao terminar, diga â€œsalvar e encerrarâ€.</li>
              </ol>
              <div className="voice-first-actions">
                {voiceActive ? (
                  <button
                    type="button"
                    className="voice-stop"
                    onClick={() => {
                      voiceInterview.stop();
                      onNotify("Entrevista pausada. Salve a conversa quando estiver pronto.");
                    }}
                  >
                    <Square size={15} fill="currentColor" /> Encerrar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void startVoiceInterview()}
                  >
                    <Mic size={17} /> ComeÃ§ar entrevista por voz
                  </button>
                )}
                {!voiceActive && voiceTranscript.some((item) => item.role === "user") && (
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={voiceSaving}
                    onClick={() => void saveVoiceInterview()}
                  >
                    {voiceSaving ? (
                      <RefreshCw className="spin" size={15} />
                    ) : (
                      <ShieldCheck size={15} />
                    )}
                    Salvar para revisÃ£o
                  </button>
                )}
              </div>
              <span className="voice-status">
                {voiceInterview.state === "connecting"
                  ? "Conectando com seguranÃ§aâ€¦"
                  : voiceInterview.state === "speaking"
                    ? "Fifones estÃ¡ falando â€” vocÃª pode interromper"
                    : voiceInterview.state === "listening"
                      ? "Fifones estÃ¡ ouvindo"
                      : voiceTranscript.length
                        ? "Conversa pausada"
                        : "Pronto para comeÃ§ar"}
              </span>
            </div>
          </section>

          {voiceTranscript.length > 0 && (
            <div className="voice-transcript">
              <span className="section-label">TRANSCRIÃ‡ÃƒO VISÃVEL</span>
              {voiceTranscript.slice(-6).map((message) => (
                <p className={message.role} key={message.id}>
                  <strong>{message.role === "user" ? "VocÃª" : "Fifones"}</strong>
                  {message.content}
                </p>
              ))}
            </div>
          )}

          <details className="manual-interview">
            <summary>
              Ver as {module.questions.length} perguntas planejadas ou responder por escrito
            </summary>
            <div className="questions">
            {module.questions.map((question, index) => {
              const key = `${module.id}-${index}`;
              return (
                <label key={question}>
                  <span>
                    <em>0{index + 1}</em>
                    {question}
                  </span>
                  <div className="dictation-field">
                    <textarea
                      rows={3}
                      placeholder="Fale como se estivesse contando para alguÃ©m que conhece vocÃª hÃ¡ anosâ€¦"
                      value={answers[key] ?? ""}
                      onChange={(event) =>
                        setAnswers((current) => ({ ...current, [key]: event.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className={recordingKey === key ? "recording" : ""}
                      onClick={() => void toggleDictation(key)}
                      disabled={Boolean(transcribingKey)}
                      title="Ditar resposta"
                    >
                      {transcribingKey === key ? (
                        <RefreshCw className="spin" size={16} />
                      ) : recordingKey === key ? (
                        <Square size={14} fill="currentColor" />
                      ) : (
                        <Mic size={16} />
                      )}
                      {transcribingKey === key
                        ? "transcrevendo"
                        : recordingKey === key
                          ? "parar"
                          : "ditar"}
                    </button>
                  </div>
                </label>
              );
            })}
            </div>
            <div className="interview-actions">
              <span>
                <ShieldCheck size={14} /> SerÃ¡ salvo como candidato sensÃ­vel
              </span>
              <button className="primary-button" onClick={saveInterview} disabled={saving}>
                {saving ? <RefreshCw className="spin" size={17} /> : <ArrowRight size={17} />}
                Preparar para revisÃ£o
              </button>
            </div>
          </details>
        </section>
      </div>

      <section className="journal-card">
        <div>
          <BookHeart size={22} />
          <span className="eyebrow">DIÃRIO RÃPIDO</span>
          <h2>O que ficou com vocÃª hoje?</h2>
          <p>Um registro curto ajuda o Fifones a perceber mudanÃ§a, nÃ£o apenas repetir seu passado.</p>
        </div>
        <div className="journal-input">
          <div className="dictation-field">
            <textarea
              rows={4}
              value={journal}
              onChange={(event) => setJournal(event.target.value)}
              placeholder="Uma decisÃ£o, uma tensÃ£o, algo que vocÃª percebeu sobre siâ€¦"
            />
            <button
              type="button"
              className={recordingKey === "journal" ? "recording" : ""}
              onClick={() => void toggleDictation("journal")}
              disabled={Boolean(transcribingKey)}
            >
              {transcribingKey === "journal" ? (
                <RefreshCw className="spin" size={16} />
              ) : recordingKey === "journal" ? (
                <Square size={14} fill="currentColor" />
              ) : (
                <Mic size={16} />
              )}
              {transcribingKey === "journal"
                ? "transcrevendo"
                : recordingKey === "journal"
                  ? "parar"
                  : "ditar"}
            </button>
          </div>
          <button className="journal-save" onClick={saveJournal} disabled={!journal.trim()}>
            <Plus size={17} /> Guardar entrada
          </button>
        </div>
      </section>

      <section className="weekly-card">
        <div className="weekly-intro">
          <RefreshCw size={20} />
          <span className="eyebrow">REVISÃƒO SEMANAL</span>
          <h2>VocÃª mudou â€” seu mapa tambÃ©m pode.</h2>
          <p>Estas respostas ajudam a distinguir padrÃ£o antigo de mudanÃ§a real.</p>
        </div>
        <div className="weekly-prompts">
          {[
            "Qual decisÃ£o mais ocupou sua mente nesta semana?",
            "Onde vocÃª agiu alinhado â€” ou desalinhado â€” com seus valores?",
            "O que o Fifones deveria atualizar sobre vocÃª?"
          ].map((prompt, index) => (
            <label key={prompt}>
              {prompt}
              <input
                value={weekly[index]}
                onChange={(event) =>
                  setWeekly((current) =>
                    current.map((answer, currentIndex) =>
                      currentIndex === index ? event.target.value : answer
                    )
                  )
                }
              />
            </label>
          ))}
          <button
            className="primary-button"
            onClick={saveWeeklyReview}
            disabled={!weekly.some((answer) => answer.trim())}
          >
            <Check size={16} /> Preparar revisÃ£o
          </button>
        </div>
      </section>
    </div>
  );
}

const emptyMemory: MemoryInput = {
  category: "fact",
  title: "",
  content: "",
  source: "Registro manual",
  confidence: 0.8,
  sensitivity: "normal",
  status: "candidate"
};

function MemoryEditor({
  memory,
  onClose,
  onSave
}: {
  memory?: MemoryRecord;
  onClose: () => void;
  onSave: (input: MemoryInput) => Promise<void>;
}) {
  const [form, setForm] = useState<MemoryInput>(memory ?? emptyMemory);
  const set = <K extends keyof MemoryInput>(key: K, value: MemoryInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(form);
        }}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">MEMÃ“RIA AUDITÃVEL</span>
            <h2>{memory ? "Revisar memÃ³ria" : "Nova memÃ³ria"}</h2>
          </div>
          <button type="button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <label>
          TÃ­tulo
          <input
            required
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
          />
        </label>
        <label>
          ConteÃºdo
          <textarea
            required
            rows={7}
            value={form.content}
            onChange={(event) => set("content", event.target.value)}
          />
        </label>
        <div className="field-row">
          <label>
            Tipo
            <select
              value={form.category}
              onChange={(event) => set("category", event.target.value as MemoryCategory)}
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sensibilidade
            <select
              value={form.sensitivity}
              onChange={(event) =>
                set("sensitivity", event.target.value as MemoryInput["sensitivity"])
              }
            >
              <option value="normal">Normal</option>
              <option value="sensitive">SensÃ­vel</option>
              <option value="restricted">Restrita â€” nunca enviar</option>
            </select>
          </label>
        </div>
        <label>
          ConfianÃ§a: {Math.round(form.confidence * 100)}%
          <input
            type="range"
            min="0.3"
            max="1"
            step="0.01"
            value={form.confidence}
            onChange={(event) => set("confidence", Number(event.target.value))}
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button">
            <Check size={17} /> Salvar revisÃ£o
          </button>
        </div>
      </form>
    </div>
  );
}

function MemoriesView({
  data,
  onRefresh,
  onNotify
}: {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  onNotify: (message: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "candidate" | "confirmed">("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<MemoryRecord | "new">();
  const memories = data.memories.filter(
    (memory) =>
      (filter === "all" || memory.status === filter) &&
      `${memory.title} ${memory.content}`.toLowerCase().includes(query.toLowerCase())
  );

  async function save(input: MemoryInput) {
    await window.eco.saveMemory(input);
    setEditing(undefined);
    await onRefresh();
    onNotify("MemÃ³ria salva com histÃ³rico de revisÃ£o.");
  }

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MEMÃ“RIA PESSOAL</span>
          <h1>Nada entra sem passar por vocÃª.</h1>
          <p>Confirme, corrija, restrinja ou exclua qualquer lembranÃ§a.</p>
        </div>
        <button className="primary-button" onClick={() => setEditing("new")}>
          <Plus size={17} /> Nova memÃ³ria
        </button>
      </div>

      <div className="memory-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            placeholder="Buscar nas suas memÃ³rias"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="segmented">
          {(["all", "candidate", "confirmed"] as const).map((item) => (
            <button
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
              key={item}
            >
              {item === "all" ? "Todas" : item === "candidate" ? "Para revisar" : "Confirmadas"}
            </button>
          ))}
        </div>
      </div>

      {memories.length ? (
        <div className="memory-grid">
          {memories.map((memory) => (
            <article className={`memory-card ${memory.status}`} key={memory.id}>
              <div className="memory-card-head">
                <span className={`category category-${memory.category}`}>
                  {CATEGORY_LABELS[memory.category]}
                </span>
                <div>
                  {memory.sensitivity === "restricted" && (
                    <span title="Nunca sai do dispositivo" aria-label="Nunca sai do dispositivo">
                      <Lock size={14} aria-hidden="true" />
                    </span>
                  )}
                  <button onClick={() => setEditing(memory)}>
                    <Edit3 size={15} />
                  </button>
                </div>
              </div>
              <h3>{memory.title}</h3>
              <p>{memory.content}</p>
              <div className="memory-source">
                <span>{memory.source}</span>
                <i />
                <span>{Math.round(memory.confidence * 100)}% confianÃ§a</span>
                <i />
                <span>v{memory.revision}</span>
              </div>
              {memory.status === "candidate" ? (
                <div className="review-actions">
                  <button
                    className="reject"
                    onClick={async () => {
                      await window.eco.reviewMemory(memory.id, "rejected");
                      await onRefresh();
                    }}
                  >
                    <X size={15} /> Rejeitar
                  </button>
                  <button
                    className="confirm"
                    onClick={async () => {
                      await window.eco.reviewMemory(memory.id, "confirmed");
                      await onRefresh();
                    }}
                  >
                    <Check size={15} /> Confirmar
                  </button>
                </div>
              ) : (
                <div className="memory-foot">
                  <span>
                    <Check size={14} /> {memory.status === "confirmed" ? "confirmada" : "rejeitada"}
                  </span>
                  <button
                    onClick={async () => {
                      if (window.confirm("Excluir esta memÃ³ria e todo o histÃ³rico?")) {
                        await window.eco.deleteMemory(memory.id);
                        await onRefresh();
                      }
                    }}
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="large-empty">
          <Database size={34} />
          <h2>Nenhuma memÃ³ria aqui.</h2>
          <p>As entrevistas e o diÃ¡rio criarÃ£o candidatas para vocÃª revisar.</p>
        </div>
      )}
      {editing && (
        <MemoryEditor
          memory={editing === "new" ? undefined : editing}
          onClose={() => setEditing(undefined)}
          onSave={save}
        />
      )}
    </div>
  );
}

function ContractsView({
  data,
  onRefresh,
  onNotify
}: {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  onNotify: (message: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ContractInput>({
    objective: "",
    reason: "",
    limits: "",
    intensity: 1,
    stopCondition: "Quando eu disser â€œpareâ€ ou demonstrar desconforto.",
    deadline: ""
  });
  const active = data.contracts.find((contract) => contract.status === "active");

  async function create(event: FormEvent) {
    event.preventDefault();
    try {
      await window.eco.createContract(form);
      setCreating(false);
      await onRefresh();
      onNotify("Contrato ativado. PersuasÃ£o agora estÃ¡ limitada a este objetivo.");
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "Este objetivo nÃ£o pode ser usado em um contrato."
      );
    }
  }

  return (
    <div className="page contracts-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CONSENTIMENTO EXPLÃCITO</span>
          <h1>VocÃª decide quando pode ser pressionado.</h1>
          <p>
            Um contrato dÃ¡ direÃ§Ã£o ao Fifones sem entregar sua autonomia â€” e sÃ³ pode
            servir ao seu desenvolvimento.
          </p>
        </div>
        {!active && (
          <button className="primary-button" onClick={() => setCreating(true)}>
            <Plus size={17} /> Criar contrato
          </button>
        )}
      </div>

      <section className="contract-hero">
        <div className="contract-shield">
          <ShieldCheck size={42} />
        </div>
        {active ? (
          <div className="active-contract">
            <div className="active-label">
              <i /> CONTRATO ATIVO
            </div>
            <h2>{active.objective}</h2>
            <blockquote>{active.reason}</blockquote>
            <div className="contract-details">
              <div>
                <span>LIMITES</span>
                <p>{active.limits}</p>
              </div>
              <div>
                <span>CONDIÃ‡ÃƒO DE PARADA</span>
                <p>{active.stopCondition}</p>
              </div>
              <div>
                <span>INTENSIDADE</span>
                <p>{["Gentil", "Firme", "Incisiva"][active.intensity - 1]} Â· {active.intensity}/3</p>
              </div>
            </div>
            <button
              className="danger-outline"
              onClick={async () => {
                await window.eco.stopContract(active.id);
                await onRefresh();
                onNotify("PersuasÃ£o encerrada imediatamente.");
              }}
            >
              <Square size={15} fill="currentColor" /> Encerrar persuasÃ£o
            </button>
          </div>
        ) : (
          <div className="no-contract">
            <span className="eyebrow">PERSUASÃƒO BLOQUEADA</span>
            <h2>Nenhum objetivo tem autorizaÃ§Ã£o.</h2>
            <p>
              O Fifones pode refletir, simular e contradizer. Ele nÃ£o tentarÃ¡ convencÃª-lo
              atÃ© vocÃª definir um acordo.
            </p>
            <button className="primary-button" onClick={() => setCreating(true)}>
              Criar meu primeiro contrato <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>

      <div className="guardrail-grid">
        <article>
          <Fingerprint size={21} />
          <h3>Consentimento especÃ­fico</h3>
          <p>O acordo vale para um objetivo, nÃ£o para qualquer decisÃ£o.</p>
        </article>
        <article>
          <MicOff size={21} />
          <h3>â€œPareâ€ significa pare</h3>
          <p>A persuasÃ£o termina sem perguntas ou tentativa de retorno.</p>
        </article>
        <article>
          <Shield size={21} />
          <h3>Alto risco protegido</h3>
          <p>SaÃºde, direito, finanÃ§as crÃ­ticas e crises nunca entram neste modo.</p>
        </article>
      </div>

      {data.contracts.filter((contract) => contract.status !== "active").length > 0 && (
        <section className="contract-history">
          <span className="section-label">HISTÃ“RICO</span>
          {data.contracts
            .filter((contract) => contract.status !== "active")
            .map((contract) => (
              <div key={contract.id}>
                <span>{compactDate(contract.createdAt)}</span>
                <strong>{contract.objective}</strong>
                <em>encerrado</em>
                <button
                  onClick={async () => {
                    await window.eco.deleteContract(contract.id);
                    await onRefresh();
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
        </section>
      )}

      {creating && (
        <div className="modal-backdrop" onMouseDown={() => setCreating(false)}>
          <form
            className="modal contract-modal"
            onSubmit={create}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">ACORDO DE PERSUASÃƒO</span>
                <h2>Defina as regras antes.</h2>
              </div>
              <button type="button" onClick={() => setCreating(false)}>
                <X size={19} />
              </button>
            </div>
            <label>
              Do que vocÃª quer ser convencido?
              <input
                required
                value={form.objective}
                onChange={(event) =>
                  setForm((current) => ({ ...current, objective: event.target.value }))
                }
                placeholder="Ex.: manter uma rotina de exercÃ­cios por 30 dias"
              />
              <small>
                O objetivo precisa melhorar algo que depende de vocÃª, nunca controlar
                outra pessoa.
              </small>
            </label>
            <label>
              Por que isso importa para vocÃª?
              <textarea
                required
                rows={3}
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reason: event.target.value }))
                }
              />
            </label>
            <label>
              Limites que o Fifones nÃ£o pode ultrapassar
              <textarea
                required
                rows={2}
                value={form.limits}
                onChange={(event) =>
                  setForm((current) => ({ ...current, limits: event.target.value }))
                }
                placeholder="Sem culpa, sem mencionar familiares, sem insistir apÃ³s duas recusasâ€¦"
              />
            </label>
            <label>
              CondiÃ§Ã£o de parada
              <input
                required
                value={form.stopCondition}
                onChange={(event) =>
                  setForm((current) => ({ ...current, stopCondition: event.target.value }))
                }
              />
            </label>
            <label>
              Intensidade autorizada
              <div className="intensity-choice">
                {([1, 2, 3] as const).map((level) => (
                  <button
                    type="button"
                    className={form.intensity === level ? "active" : ""}
                    onClick={() => setForm((current) => ({ ...current, intensity: level }))}
                    key={level}
                  >
                    <strong>{level}</strong>
                    <span>{["Gentil", "Firme", "Incisiva"][level - 1]}</span>
                  </button>
                ))}
              </div>
            </label>
            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setCreating(false)}>
                Cancelar
              </button>
              <button className="primary-button">
                <ShieldCheck size={17} /> Ativar contrato
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function PrivacyView({
  data,
  onRefresh,
  onNotify
}: {
  data: BootstrapData;
  onRefresh: () => Promise<void>;
  onNotify: (message: string) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [fifonesToken, setFifonesToken] = useState("");
  const [apiTest, setApiTest] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(data.settings);
  const [localVoices, setLocalVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const loadVoices = () => setLocalVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  async function update(patch: Partial<Settings>) {
    try {
      const next = await window.eco.updateSettings(patch);
      setSettings(next);
      await onRefresh();
    } catch (error) {
      const current = await window.eco.bootstrap();
      setSettings(current.settings);
      onNotify(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel salvar a configuraÃ§Ã£o.");
    }
  }

  return (
    <div className="page privacy-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PRIVACIDADE E CONTROLE</span>
          <h1>Seu interior nÃ£o Ã© um produto.</h1>
          <p>Veja exatamente o que fica local e o que cruza a internet.</p>
        </div>
        <div className="encryption-stamp">
          <ShieldCheck size={21} />
          <div>
            <strong>{data.encryptionAvailable ? "ProteÃ§Ã£o ativa" : "ProteÃ§Ã£o indisponÃ­vel"}</strong>
            <span>cofre cifrado em repouso</span>
          </div>
        </div>
      </div>

      <div className="privacy-flow">
        <div>
          <div className="flow-icon local">
            <Database size={24} />
          </div>
          <strong>Seu computador</strong>
          <span>Banco completo, diÃ¡rio e histÃ³rico</span>
        </div>
        <ArrowRight size={20} />
        <div>
          <div className="flow-icon filter">
            <UserRoundSearch size={24} />
          </div>
          <strong>Filtro local</strong>
          <span>Seleciona contexto mÃ­nimo relevante</span>
        </div>
        <ArrowRight size={20} />
        <div>
          <div className="flow-icon cloud">
            <Sparkles size={24} />
          </div>
          <strong>OpenAI API</strong>
          <span>Ãudio, pergunta e trechos permitidos</span>
        </div>
      </div>

      <div className="settings-grid">
        <section className="settings-card api-card">
          <div className="settings-head">
            <KeyRound size={20} />
            <div>
              <h2>ConexÃ£o OpenAI</h2>
              <p>A chave Ã© protegida pelo Windows e nunca aparece no navegador.</p>
            </div>
          </div>
          {data.hasApiKey && !data.hasOwnApiToken ? (
            <div className="connected-key">
              <span>
                <Check size={16} /> chave configurada
              </span>
              <button
                onClick={async () => {
                  await window.eco.clearApiKey();
                  await onRefresh();
                  onNotify("Chave removida. O modo demonstraÃ§Ã£o estÃ¡ ativo.");
                }}
              >
                Remover
              </button>
            </div>
          ) : (
            <form
              className="key-form"
              onSubmit={async (event) => {
                event.preventDefault();
                await window.eco.setApiKey(apiKey);
                setApiKey("");
                await onRefresh();
                onNotify("Chave protegida e modo conectado ativado.");
              }}
            >
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
              />
              <button disabled={!apiKey.trim()}>
                <Lock size={15} /> Proteger
              </button>
            </form>
          )}
          <label className="toggle-row">
            <div>
              <strong>Modo demonstraÃ§Ã£o</strong>
              <span>Respostas locais sem chamadas externas</span>
            </div>
            <input
              type="checkbox"
              checked={settings.demoMode}
              onChange={(event) => void update({ demoMode: event.target.checked })}
            />
          </label>
        </section>

        <section className="settings-card api-card">
          <div className="settings-head">
            <Server size={20} />
            <div>
              <h2>API prÃ³prio do Fifones</h2>
              <p>Deixe a chave OpenAI no servidor e use apenas um token protegido neste computador.</p>
            </div>
          </div>
          <label>
            URL do API
            <input
              value={settings.aiApiBaseUrl}
              onChange={(event) => setSettings((current) => ({ ...current, aiApiBaseUrl: event.target.value }))}
              onBlur={() => void update({ aiApiBaseUrl: settings.aiApiBaseUrl.trim().replace(/\/$/, "") })}
              placeholder="http://127.0.0.1:8787"
            />
          </label>
          {data.hasOwnApiToken ? (
            <div className="connected-key">
              <span><Check size={16} /> token protegido</span>
              <button onClick={async () => { await window.eco.clearFifonesApiToken(); await onRefresh(); setApiTest(null); onNotify("Token do API prÃ³prio removido."); }}>Remover</button>
            </div>
          ) : (
            <form className="key-form" onSubmit={async (event) => { event.preventDefault(); await window.eco.setFifonesApiToken(fifonesToken); setFifonesToken(""); await onRefresh(); onNotify("Token do API prÃ³prio protegido."); }}>
              <input type="password" value={fifonesToken} onChange={(event) => setFifonesToken(event.target.value)} placeholder="token do Fifones API" />
              <button disabled={!fifonesToken.trim()}><Lock size={15} /> Proteger</button>
            </form>
          )}
          <button className="secondary-button" disabled={!settings.aiApiBaseUrl || !data.hasOwnApiToken} onClick={async () => {
            setApiTest("Testando conexÃ£o...");
            try {
              const result = await window.eco.testFifonesApi();
              setApiTest(result.ok ? `âœ“ ${result.message}` : `âœ• ${result.message}`);
            } catch (error) {
              setApiTest(`âœ• ${error instanceof Error ? error.message : "NÃ£o foi possÃ­vel conectar ao API."}`);
            }
          }}>{apiTest ?? "Testar conexÃ£o"}</button>
        </section>

        <section className="settings-card">
          <div className="settings-head">
            <Gauge size={20} />
            <div>
              <h2>Modelos configurÃ¡veis</h2>
              <p>Altere sem modificar o aplicativo.</p>
            </div>
          </div>
          <label>
            RaciocÃ­nio deliberado
            <select
              value={settings.reasoningModel}
              onChange={(event) => void update({ reasoningModel: event.target.value })}
            >
              <option value="gpt-5.6-luna">Luna Â· econÃ´mico para o cotidiano</option>
              <option value="gpt-5.6-terra">Terra Â· equilÃ­brio para planejar</option>
              <option value="gpt-5.6-sol">Sol Â· mÃ¡xima profundidade</option>
              {!settings.reasoningModel.startsWith("gpt-5.6-") && (
                <option value={settings.reasoningModel}>{settings.reasoningModel} Â· configuraÃ§Ã£o anterior</option>
              )}
            </select>
            <small>Luna custa menos; Sol sÃ³ deve ser escolhido para problemas realmente difÃ­ceis.</small>
          </label>
          <label>
            Perfil da conversa ao vivo
            <select
              value={settings.voiceProfile}
              onChange={(event) => {
                const voiceProfile = event.target.value as Settings["voiceProfile"];
                void update({
                  voiceProfile,
                  realtimeModel:
                    voiceProfile === "economy"
                      ? "gpt-realtime-2.1-mini"
                      : "gpt-realtime-2.1"
                });
              }}
            >
              <option value="economy">EconÃ´mico Â· menor custo</option>
              <option value="quality">Qualidade Â· raciocÃ­nio mais forte</option>
            </select>
            <small>{settings.realtimeModel}</small>
          </label>
          <label>
            Idioma da voz economica
            <select
              value={settings.voiceLanguage}
              onChange={(event) =>
                void update({ voiceLanguage: event.target.value as Settings["voiceLanguage"] })
              }
            >
              <option value="auto">Automatico Â· portugues ou ingles</option>
              <option value="pt-BR">Portugues brasileiro</option>
              <option value="en-US">English</option>
            </select>
          </label>
        </section>

        <section className="settings-card">
          <div className="settings-head">
            <Volume2 size={20} />
            <div>
              <h2>Voz e sessÃ£o</h2>
              <p>A voz Ã© distinta da sua por design.</p>
            </div>
          </div>
          <label>
            Voz Realtime Premium
            <select
              value={settings.voice}
              onChange={(event) => void update({ voice: event.target.value })}
            >
              <option value="cedar">Cedar Â· presenÃ§a firme (recomendada)</option>
              <option value="ash">Ash Â· tom mais grave e direto</option>
              <option value="echo">Echo Â· objetiva e segura</option>
              <option value="marin">Marin Â· natural e calorosa</option>
              <option value="alloy">Alloy Â· equilibrada</option>
              <option value="ballad">Ballad Â· suave</option>
              <option value="coral">Coral Â· expressiva</option>
              <option value="sage">Sage Â· calma e madura</option>
              <option value="shimmer">Shimmer Â· leve e brilhante</option>
              <option value="verse">Verse Â· energÃ©tica</option>
            </select>
          </label>
          <label>
            Voz local do modo econÃ´mico
            <select
              value={settings.localVoiceUri}
              onChange={(event) => void update({ localVoiceUri: event.target.value })}
            >
              <option value="">PadrÃ£o do Windows para o idioma</option>
              {localVoices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} Â· {voice.lang}
                </option>
              ))}
            </select>
            <small>Escolha uma voz masculina instalada no Windows, se houver.</small>
          </label>
          <label>
            Motor da voz econÃ´mica
            <input value="Windows · imediato e estável" disabled />
            <small>O motor local lento foi desativado para evitar atraso. Escolha acima a voz masculina instalada no Windows.</small>
          </label>
          <label>
            Bloqueio automÃ¡tico
            <select
              value={settings.autoLockMinutes}
              onChange={(event) => void update({ autoLockMinutes: Number(event.target.value) })}
            >
              <option value={5}>5 minutos</option>
              <option value={10}>10 minutos</option>
              <option value={20}>20 minutos</option>
              <option value={60}>1 hora</option>
            </select>
          </label>
          <label>
            Limite de cada fala economica
            <select
              value={settings.economyVoiceMaxSeconds}
              onChange={(event) => void update({ economyVoiceMaxSeconds: Number(event.target.value) })}
            >
              <option value={15}>15 segundos</option>
              <option value={30}>30 segundos</option>
              <option value={45}>45 segundos</option>
              <option value={60}>1 minuto</option>
            </select>
          </label>
          <label>
            Tamanho da resposta falada
            <select
              value={settings.voiceReplyMaxSentences}
              onChange={(event) => void update({ voiceReplyMaxSentences: Number(event.target.value) })}
            >
              <option value={2}>2 frases Â· mais economico</option>
              <option value={3}>3 frases Â· recomendado</option>
              <option value={5}>5 frases Â· mais detalhado</option>
            </select>
          </label>
          <label className="toggle-row">
            <div>
              <strong>Chamado â€œFala, Fifonesâ€</strong>
              <span>
                Em validaÃ§Ã£o local com Vosk; nenhum Ã¡udio fica aguardando na nuvem
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.wakePhraseEnabled}
              disabled
              onChange={(event) =>
                void update({ wakePhraseEnabled: event.target.checked })
              }
            />
          </label>
        </section>

        <section className="settings-card">
          <div className="settings-head">
            <Gauge size={20} />
            <div>
              <h2>OrÃ§amento de IA</h2>
              <p>Estimativa local para evitar surpresa na API.</p>
            </div>
          </div>
          <div className="budget-meter">
            <div><i style={{ width: `${data.usageBudget.percentUsed}%` }} /></div>
            <strong>R$ {data.usageBudget.estimatedBrl.toFixed(2)} / R$ {settings.monthlyBudgetBrl.toFixed(2)}</strong>
          </div>
          {data.usageBudget.percentUsed >= 80 && !data.usageBudget.blocked && (
            <p className="budget-warning">
              VocÃª jÃ¡ usou {Math.round(data.usageBudget.percentUsed)}% do limite estimado deste mÃªs.
            </p>
          )}
          <label>
            Limite mensal estimado
            <input
              type="number"
              min={5}
              max={500}
              value={settings.monthlyBudgetBrl}
              onChange={(event) =>
                setSettings((current) => ({ ...current, monthlyBudgetBrl: Number(event.target.value) }))
              }
              onBlur={() => void update({ monthlyBudgetBrl: settings.monthlyBudgetBrl })}
            />
          </label>
          {data.usageBudget.blocked && (
            <button
              className="wide-action"
              onClick={async () => {
                await window.eco.setBudgetOverride(true);
                onNotify("ExceÃ§Ã£o liberada atÃ© o aplicativo ser reiniciado.");
              }}
            >
              Liberar exceÃ§Ã£o nesta sessÃ£o
            </button>
          )}
        </section>

        <section className="settings-card">
          <div className="settings-head">
            <AlarmClock size={20} />
            <div>
              <h2>Rotina e proatividade</h2>
              <p>Fifones lembra sem perseguir.</p>
            </div>
          </div>
          <div className="quiet-hours">
            <label>SilÃªncio comeÃ§a<input type="time" value={settings.quietHoursStart} onChange={(event) => void update({ quietHoursStart: event.target.value })} /></label>
            <label>SilÃªncio termina<input type="time" value={settings.quietHoursEnd} onChange={(event) => void update({ quietHoursEnd: event.target.value })} /></label>
          </div>
          <label>
            MÃ¡ximo de tentativas
            <select value={settings.maxFollowups} onChange={(event) => void update({ maxFollowups: Number(event.target.value) })}>
              <option value={1}>1 tentativa</option>
              <option value={2}>2 tentativas</option>
              <option value={3}>3 tentativas</option>
            </select>
          </label>
          <label>
            Atalho global
            <input
              value={settings.globalShortcut}
              onChange={(event) =>
                setSettings((current) => ({ ...current, globalShortcut: event.target.value }))
              }
              onBlur={() => void update({ globalShortcut: settings.globalShortcut })}
              placeholder="CommandOrControl+Shift+F"
            />
          </label>
          <label className="toggle-row">
            <div><strong>Lembretes proativos</strong><span>Respeita silÃªncio e limite de tentativas</span></div>
            <input type="checkbox" checked={settings.proactiveEnabled} onChange={(event) => void update({ proactiveEnabled: event.target.checked })} />
          </label>
          <label className="toggle-row">
            <div><strong>Abrir com o Windows</strong><span>Fifones fica disponÃ­vel na bandeja</span></div>
            <input type="checkbox" checked={settings.launchAtLogin} onChange={(event) => void update({ launchAtLogin: event.target.checked })} />
          </label>
          <label className="toggle-row">
            <div><strong>Compacto sempre visÃ­vel</strong><span>Atalho: Ctrl + Shift + F</span></div>
            <input type="checkbox" checked={settings.compactAlwaysOnTop} onChange={(event) => void update({ compactAlwaysOnTop: event.target.checked })} />
          </label>
        </section>

        <section className="settings-card skills-card">
          <div className="settings-head">
            <BrainCircuit size={20} />
            <div><h2>Skills do Fifones</h2><p>PermissÃµes visÃ­veis e aÃ§Ãµes externas sempre confirmadas.</p></div>
          </div>
          <div className="skills-list">
            {data.skills.map((skill) => (
              <article key={skill.id}>
                <div><strong>{skill.name}</strong><span>{skill.description}</span></div>
                <em className={`skill-risk ${skill.risk}`}>{skill.risk}</em>
                <small>{skill.permissions.map((permission) => permission.label).join(" Â· ")}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="settings-card action-governance-card">
          <div className="settings-head">
            <ShieldCheck size={20} />
            <div>
              <h2>AutorizaÃ§Ãµes e histÃ³rico</h2>
              <p>A IA pode sugerir; aÃ§Ãµes externas sÃ³ avanÃ§am com sua autorizaÃ§Ã£o.</p>
            </div>
          </div>
          {data.pendingApprovals.length === 0 ? (
            <div className="governance-empty">
              <Check size={16} /> Nenhuma aÃ§Ã£o externa aguardando autorizaÃ§Ã£o.
            </div>
          ) : (
            <div className="approval-list">
              {data.pendingApprovals.map((approval) => (
                <article key={approval.id}>
                  <div>
                    <strong>{approval.preview}</strong>
                    <span>Expira em {new Date(approval.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="approval-actions">
                    <button onClick={async () => { await window.eco.resolveActionApproval(approval.id, "reject"); await onRefresh(); }}>Recusar</button>
                    <button className="primary-button" onClick={async () => { await window.eco.resolveActionApproval(approval.id, "approve"); await onRefresh(); }}>Autorizar</button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="audit-list">
            {data.auditEvents.slice(0, 6).map((event) => (
              <article key={event.id}>
                <span className={`audit-decision ${event.decision}`}>{event.decision}</span>
                <div><strong>{event.actionType}</strong><small>{event.summary}</small></div>
                <time>{new Date(event.createdAt).toLocaleString("pt-BR")}</time>
              </article>
            ))}
            {data.auditEvents.length === 0 && <small>O histÃ³rico comeÃ§arÃ¡ quando vocÃª confirmar ou recusar uma aÃ§Ã£o.</small>}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-head">
            <CalendarDays size={20} />
            <div>
              <h2>Google Calendar</h2>
              <p>Somente leitura. O Fifones nÃ£o cria nem altera eventos.</p>
            </div>
          </div>
          <label>
            Client ID para aplicativo de computador
            <input
              value={settings.googleCalendarClientId}
              onChange={(event) =>
                setSettings((current) => ({ ...current, googleCalendarClientId: event.target.value }))
              }
              onBlur={() => void update({ googleCalendarClientId: settings.googleCalendarClientId })}
              placeholder="000000000000-...apps.googleusercontent.com"
            />
          </label>
          {data.googleCalendarConnected ? (
            <div className="connected-key">
              <span><Check size={16} /> agenda conectada para leitura</span>
              <button onClick={async () => {
                await window.eco.disconnectGoogleCalendar();
                await onRefresh();
                onNotify("Google Calendar desconectado e token local removido.");
              }}>Desconectar</button>
            </div>
          ) : (
            <button
              className="wide-action"
              disabled={!settings.googleCalendarClientId.trim()}
              onClick={async () => {
                try {
                  await update({ googleCalendarClientId: settings.googleCalendarClientId });
                  await window.eco.connectGoogleCalendar();
                  await onRefresh();
                  onNotify("Google Calendar conectado somente para leitura.");
                } catch (error) {
                  onNotify(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel conectar a agenda.");
                }
              }}
            >
              <CalendarDays size={16} /> Conectar agenda em modo leitura
            </button>
          )}
        </section>

        <section className="settings-card data-card">
          <div className="settings-head">
            <Download size={20} />
            <div>
              <h2>Seus dados</h2>
              <p>Portabilidade e exclusÃ£o sÃ£o controles de primeira classe.</p>
            </div>
          </div>
          <button
            className="wide-action"
            onClick={async () => {
              const result = await window.eco.exportData();
              if (!result.canceled) onNotify(`Exportado para ${result.path}`);
            }}
          >
            <Download size={16} /> Exportar tudo em JSON
          </button>
          <button
            className="wide-action danger"
            onClick={async () => {
              if (
                window.confirm(
                  "Excluir definitivamente memÃ³rias, pessoas, tarefas, lembretes, contratos, conversas e a conexÃ£o com a agenda? Esta aÃ§Ã£o nÃ£o pode ser desfeita."
                )
              ) {
                await window.eco.deleteAllData();
                await onRefresh();
                onNotify("Todos os dados pessoais foram excluÃ­dos.");
              }
            }}
          >
            <Trash2 size={16} /> Excluir todos os dados pessoais
          </button>
        </section>
      </div>

      <div className="retention-note">
        <Shield size={18} />
        <p>
          As chamadas de texto usam <code>store: false</code>. A OpenAI informa que
          dados da API nÃ£o sÃ£o usados para treinamento por padrÃ£o; logs de monitoramento
          podem ser mantidos conforme os controles da conta. Ãudio e contexto selecionado
          sÃ£o enviados durante sessÃµes conectadas.
        </p>
      </div>
    </div>
  );
}

function LockScreen({ onUnlock }: { onUnlock: () => Promise<void> }) {
  const [unlocking, setUnlocking] = useState(false);
  return (
    <div className="lock-screen">
      <div className="lock-brand">F</div>
      <span className="eyebrow">COFRE BLOQUEADO</span>
      <h1>Seu outro ponto de vista estÃ¡ protegido.</h1>
      <p>A chave foi removida da memÃ³ria. Desbloqueie para continuar.</p>
      <button
        onClick={async () => {
          setUnlocking(true);
          await onUnlock();
          setUnlocking(false);
        }}
      >
        {unlocking ? <RefreshCw className="spin" size={18} /> : <Unlock size={18} />}
        Desbloquear com o Windows
      </button>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<BootstrapData>();
  const [view, setView] = useState<View>("today");
  const [locked, setLocked] = useState(false);
  const [toast, setToast] = useState("");
  const [wakeRequest, setWakeRequest] = useState(0);
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const [voiceImmersive, setVoiceImmersive] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [auraOnly, setAuraOnly] = useState(false);
  const lastActivity = useRef(Date.now());
  const handleVoiceActiveChange = useCallback((active: boolean) => {
    setVoiceSessionActive(active);
  }, []);

  const wakePhrase = useWakePhrase({
    enabled: Boolean(data?.settings.wakePhraseEnabled && !locked),
    suspended: voiceSessionActive,
    onWake: () => {
      void window.eco.summonWindow();
      setView("chat");
      setWakeRequest((current) => current + 1);
      setToast("TÃ´ aqui, Fifo. Manda a boa.");
    }
  });

  async function refresh() {
    const next = await window.eco.bootstrap();
    setData(next);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const removeCompact = window.eco.onCompactMode((compact) => {
      setCompactMode(compact);
      if (compact) setView("today");
    });
    const removeAuraOnly = window.eco.onAuraOnly(setAuraOnly);
    const removeNavigate = window.eco.onNavigate((next) => {
      if (["today", "calendar", "chat", "formation", "memories", "people", "contracts", "privacy"].includes(next)) {
        setView(next as View);
        void refresh();
      }
    });
    return () => {
      removeCompact();
      removeAuraOnly();
      removeNavigate();
    };
  }, []);

  useEffect(() => {
    if (!data || locked || voiceSessionActive) return;
    const markActivity = () => {
      lastActivity.current = Date.now();
    };
    window.addEventListener("pointerdown", markActivity);
    window.addEventListener("keydown", markActivity);
    const timer = window.setInterval(async () => {
      if (Date.now() - lastActivity.current > data.settings.autoLockMinutes * 60_000) {
        await window.eco.lock();
        setLocked(true);
      }
    }, 10_000);
    return () => {
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.clearInterval(timer);
    };
  }, [data, locked, voiceSessionActive]);

  const title = useMemo(
    () =>
      ({
        today: "Hoje",
        calendar: "CalendÃ¡rio",
        chat: "Conversa",
        formation: "FormaÃ§Ã£o",
        memories: "MemÃ³rias",
        people: "Pessoas",
        contracts: "Contratos",
        privacy: "Privacidade"
      })[view],
    [view]
  );

  if (!data) {
    return (
      <div className="splash">
        <div className="splash-mark">F</div>
        <span>abrindo seu cofre local</span>
      </div>
    );
  }

  if (locked) {
    return (
      <LockScreen
        onUnlock={async () => {
          const next = await window.eco.unlock();
          setData(next);
          lastActivity.current = Date.now();
          setLocked(false);
        }}
      />
    );
  }

  return (
    <div className={`app-shell ${voiceImmersive ? "voice-immersive" : ""} ${compactMode ? "compact-mode" : ""} ${auraOnly ? "aura-only" : ""}`}>
      <Sidebar
        view={view}
        onView={setView}
        stats={data.stats}
        wakeEnabled={data.settings.wakePhraseEnabled}
        wakeSupported={wakePhrase.supported}
        wakeState={wakePhrase.state}
        onToggleWake={() => {
          if (!wakePhrase.supported && !data.settings.wakePhraseEnabled) {
            setToast("O chamado local ainda estÃ¡ em validaÃ§Ã£o. Use Ctrl + Shift + F por enquanto.");
            return;
          }
          const enabled = !data.settings.wakePhraseEnabled;
          void window.eco
            .updateSettings({ wakePhraseEnabled: enabled })
            .then((settings) => {
              setData((current) => (current ? { ...current, settings } : current));
              setToast(
                enabled
                  ? "Chamado ativado. Com o app aberto ou minimizado, diga: â€œFala, Fifonesâ€."
                  : "Chamado por voz pausado."
              );
            });
        }}
      />
      <main className="main-shell">
        <Topbar
          title={title}
          demoMode={data.settings.demoMode || !data.hasApiKey}
          onLock={async () => {
            await window.eco.lock();
            setLocked(true);
          }}
        />
        <div className="view-shell">
          {view === "today" && (
            <TodayView
              data={data}
              onRefresh={refresh}
              onNotify={setToast}
              onStartVoice={() => {
                if (auraOnly) {
                  void window.eco.toggleAuraOnly();
                }
                setView("chat");
                setWakeRequest((current) => current + 1);
              }}
              auraOnly={auraOnly}
              onToggleAuraOnly={() => {
                void window.eco.toggleAuraOnly();
              }}
            />
          )}
          {view === "calendar" && (
            <CalendarView data={data} onRefresh={refresh} onNotify={setToast} />
          )}
          {view === "chat" && (
            <ChatView
              data={data}
              updateMessages={(update) =>
                setData((current) =>
                  current ? { ...current, messages: update(current.messages) } : current
                )
              }
              onNotify={setToast}
              onGoContracts={() => setView("contracts")}
              onRefresh={refresh}
              wakeRequest={wakeRequest}
              onVoiceActiveChange={handleVoiceActiveChange}
              onImmersiveChange={setVoiceImmersive}
            />
          )}
          {view === "formation" && (
            <FormationView
              data={data}
              onRefresh={refresh}
              onNotify={setToast}
              onVoiceActiveChange={handleVoiceActiveChange}
            />
          )}
          {view === "memories" && (
            <MemoriesView data={data} onRefresh={refresh} onNotify={setToast} />
          )}
          {view === "people" && (
            <PeopleView data={data} onRefresh={refresh} onNotify={setToast} />
          )}
          {view === "contracts" && (
            <ContractsView data={data} onRefresh={refresh} onNotify={setToast} />
          )}
          {view === "privacy" && (
            <PrivacyView data={data} onRefresh={refresh} onNotify={setToast} />
          )}
        </div>
      </main>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}


