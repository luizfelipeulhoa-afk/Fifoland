import { useCallback, useEffect, useRef, useState } from "react";
import type { AdviceMode, ChatMessage } from "../shared/types";
import { isStopPhrase } from "../core/safety";
import {
  calculateFrequencyBands,
  calculateRms,
  normalizeAudioLevel
} from "../core/audio-reactivity";
import { SILENT_AUDIO_ENERGY, type AudioEnergy } from "./voice/types";
import {
  describeVoiceMediaError,
  releaseVoiceAudioElement,
  stopMediaStreamTracks
} from "./voice/audioLifecycle";

type VoiceState = "idle" | "connecting" | "listening" | "processing" | "speaking" | "error";

interface RealtimeEvent {
  type?: string;
  transcript?: string;
  delta?: string;
  item_id?: string;
  response_id?: string;
  error?: { message?: string };
  response?: {
    usage?: {
      input_token_details?: {
        text_tokens?: number;
        audio_tokens?: number;
      };
      output_token_details?: {
        text_tokens?: number;
        audio_tokens?: number;
      };
    };
  };
}

export function useRealtime(args: {
  mode: AdviceMode;
  onMessage: (message: ChatMessage) => void;
  onError: (message: string) => void;
  onUsage?: () => void;
  onStopPhrase?: (transcript: string) => void;
  experience?: "advisor" | "interview";
  interviewModuleId?: string;
  startWithAssistant?: boolean;
  persistMessages?: boolean;
  shouldStop?: (transcript: string) => boolean;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const assistantTranscript = useRef("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startingRef = useRef(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [inputEnergy, setInputEnergy] = useState<AudioEnergy>(SILENT_AUDIO_ENERGY);
  const [outputEnergy, setOutputEnergy] = useState<AudioEnergy>(SILENT_AUDIO_ENERGY);

  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    inputSourceRef.current?.disconnect();
    outputSourceRef.current?.disconnect();
    inputSourceRef.current = null;
    outputSourceRef.current = null;
    inputAnalyserRef.current = null;
    outputAnalyserRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setInputLevel(0);
    setOutputLevel(0);
    setInputEnergy(SILENT_AUDIO_ENERGY);
    setOutputEnergy(SILENT_AUDIO_ENERGY);
  }, []);

  const startAudioAnalysis = useCallback((input?: MediaStream, output?: MediaStream) => {
    if (!input && !output) return;
    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;
    if (context.state === "suspended") void context.resume();
    if (input && !inputAnalyserRef.current) {
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.55;
      inputSourceRef.current = context.createMediaStreamSource(input);
      inputSourceRef.current.connect(analyser);
      inputAnalyserRef.current = analyser;
    }
    if (output && !outputAnalyserRef.current) {
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.45;
      outputSourceRef.current = context.createMediaStreamSource(output);
      outputSourceRef.current.connect(analyser);
      outputAnalyserRef.current = analyser;
    }
    if (animationFrameRef.current !== null) return;
    const inputTimeData = new Uint8Array(1024);
    const outputTimeData = new Uint8Array(1024);
    const inputFrequencyData = new Uint8Array(512);
    const outputFrequencyData = new Uint8Array(512);
    let lastInput: AudioEnergy = SILENT_AUDIO_ENERGY;
    let lastOutput: AudioEnergy = SILENT_AUDIO_ENERGY;
    const sampleEnergy = (
      analyser: AnalyserNode | null,
      timeData: Uint8Array,
      frequencyData: Uint8Array
    ): AudioEnergy => {
      if (!analyser) return SILENT_AUDIO_ENERGY;
      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(frequencyData);
      const bands = calculateFrequencyBands(frequencyData, context.sampleRate, analyser.fftSize);
      return {
        level: normalizeAudioLevel(calculateRms(timeData)),
        ...bands,
        analyzable: true
      };
    };
    const changed = (next: AudioEnergy, previous: AudioEnergy) =>
      Math.abs(next.level - previous.level) > 0.012 ||
      Math.abs(next.bass - previous.bass) > 0.018 ||
      Math.abs(next.mid - previous.mid) > 0.018 ||
      Math.abs(next.treble - previous.treble) > 0.018 ||
      next.analyzable !== previous.analyzable;
    const sample = () => {
      const nextInput = sampleEnergy(inputAnalyserRef.current, inputTimeData, inputFrequencyData);
      const nextOutput = sampleEnergy(outputAnalyserRef.current, outputTimeData, outputFrequencyData);
      if (changed(nextInput, lastInput)) {
        lastInput = nextInput;
        setInputLevel(nextInput.level);
        setInputEnergy(nextInput);
      }
      if (changed(nextOutput, lastOutput)) {
        lastOutput = nextOutput;
        setOutputLevel(nextOutput.level);
        setOutputEnergy(nextOutput);
      }
      animationFrameRef.current = requestAnimationFrame(sample);
    };
    animationFrameRef.current = requestAnimationFrame(sample);
  }, []);

  const stop = useCallback(() => {
    stopAudioAnalysis();
    stopMediaStreamTracks(streamRef.current);
    peerRef.current?.close();
    releaseVoiceAudioElement(audioRef.current);
    streamRef.current = null;
    peerRef.current = null;
    channelRef.current = null;
    audioRef.current = null;
    assistantTranscript.current = "";
    setState("idle");
  }, [stopAudioAnalysis]);

  const start = useCallback(async () => {
    if (startingRef.current || peerRef.current) return;
    startingRef.current = true;
    try {
      setState("connecting");
      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.setAttribute("playsinline", "true");
      audioRef.current = audio;
      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0];
        startAudioAnalysis(undefined, event.streams[0]);
        void audio.play().catch(() => {
          args.onError("O Windows bloqueou a reprodução automática. Toque em Parar e inicie a voz novamente.");
        });
      };

      peer.onconnectionstatechange = () => {
        if (peerRef.current !== peer) return;
        if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
          stop();
          setState("error");
          args.onError("A conexão de voz caiu. Toque novamente para reconectar.");
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;
      startAudioAnalysis(stream);
      peer.addTrack(stream.getAudioTracks()[0]);

      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.onerror = () => {
        if (peerRef.current !== peer) return;
        stop();
        setState("error");
        args.onError("O canal da conversa por voz falhou. Toque novamente para reconectar.");
      };
      channel.onopen = () => {
        setState("listening");
        if (args.startWithAssistant) {
          channel.send(
            JSON.stringify({
              type: "response.create",
              response: { output_modalities: ["audio"] }
            })
          );
        }
      };
      channel.onmessage = (event) => {
        let payload: RealtimeEvent;
        try {
          payload = JSON.parse(event.data) as RealtimeEvent;
        } catch {
          return;
        }
        if (payload.type === "input_audio_buffer.speech_started") setState("listening");
        if (payload.type === "input_audio_buffer.speech_stopped") setState("processing");
        if (payload.type === "response.created") setState("processing");
        if (payload.type === "response.output_audio.delta") setState("speaking");
        if (
          payload.type === "conversation.item.input_audio_transcription.completed" &&
          payload.transcript
        ) {
          const message: ChatMessage = {
            id: payload.item_id ?? crypto.randomUUID(),
            role: "user",
            content: payload.transcript,
            createdAt: new Date().toISOString(),
            mode: args.mode
          };
          args.onMessage(message);
          if (args.persistMessages !== false) {
            void window.eco.saveRealtimeMessage(message);
          }
          const shouldStop =
            args.shouldStop?.(payload.transcript) ?? isStopPhrase(payload.transcript);
          if (shouldStop) {
            args.onStopPhrase?.(payload.transcript);
            stop();
          }
        }
        if (payload.type === "response.output_audio_transcript.delta") {
          assistantTranscript.current += payload.delta ?? "";
        }
        if (
          payload.type === "response.output_audio_transcript.done" &&
          (assistantTranscript.current || payload.transcript)
        ) {
          const message: ChatMessage = {
            id: payload.response_id ?? crypto.randomUUID(),
            role: "assistant",
            content: assistantTranscript.current || payload.transcript || "",
            createdAt: new Date().toISOString(),
            mode: args.mode
          };
          assistantTranscript.current = "";
          args.onMessage(message);
          if (args.persistMessages !== false) {
            void window.eco.saveRealtimeMessage(message);
          }
          setState("listening");
        }
        if (payload.type === "response.done" && payload.response?.usage) {
          const usage = payload.response.usage;
          void window.eco
            .recordRealtimeUsage({
              inputTextTokens: usage.input_token_details?.text_tokens,
              inputAudioTokens: usage.input_token_details?.audio_tokens,
              outputTextTokens: usage.output_token_details?.text_tokens,
              outputAudioTokens: usage.output_token_details?.audio_tokens
            })
            .then(() => args.onUsage?.())
            .catch(() => undefined);
        }
        if (payload.type === "error") {
          args.onError(payload.error?.message ?? "Erro na sessão de voz.");
          setState("error");
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const answer = await window.eco.connectRealtime({
        sdp: offer.sdp ?? "",
        mode: args.mode,
        experience: args.experience ?? "advisor",
        interviewModuleId: args.interviewModuleId
      });
      await peer.setRemoteDescription({ type: "answer", sdp: answer.sdp });
    } catch (error) {
      stop();
      const message = describeVoiceMediaError(error);
      args.onError(message);
      setState("error");
    } finally {
      startingRef.current = false;
    }
  }, [args, startAudioAnalysis, stop]);

  const speak = useCallback((instructions: string) => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== "open") return false;
    channel.send(
      JSON.stringify({
        type: "response.create",
        response: {
          output_modalities: ["audio"],
          instructions
        }
      })
    );
    return true;
  }, []);

  useEffect(() => stop, [stop]);

  return { state, start, stop, speak, inputLevel, outputLevel, inputEnergy, outputEnergy };
}
