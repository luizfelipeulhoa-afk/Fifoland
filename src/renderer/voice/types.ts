export type FifonesVoiceState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error"
  | "disabled";

export interface AudioEnergy {
  level: number;
  bass: number;
  mid: number;
  treble: number;
  analyzable: boolean;
}

export const SILENT_AUDIO_ENERGY: AudioEnergy = {
  level: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  analyzable: false
};

export function toFifonesVoiceState(state: string, disabled = false): FifonesVoiceState {
  if (disabled) return "disabled";
  if (state === "connecting" || state === "processing") return "thinking";
  if (state === "listening" || state === "speaking" || state === "error") return state;
  return "idle";
}

export const VOICE_STATE_LABELS: Record<FifonesVoiceState, string> = {
  idle: "Fifones está disponível",
  listening: "Fifones está ouvindo você",
  thinking: "Fifones está processando",
  speaking: "Fifones está falando",
  error: "A voz do Fifones encontrou um problema",
  disabled: "A conversa por voz está desativada"
};
