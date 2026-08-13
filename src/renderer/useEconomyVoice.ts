import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceLanguage } from "../shared/types";

export type EconomyVoiceState =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "error";

interface EconomyVoiceOptions {
  language: VoiceLanguage;
  localVoiceUri: string;
  localVoiceProvider: "windows" | "kokoro";
  kokoroVoice: string;
  maxSeconds: number;
  onTranscript: (text: string) => Promise<string | null>;
  onError: (message: string) => void;
}

function preferredMimeType(): string {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find(
    (type) => MediaRecorder.isTypeSupported(type)
  ) ?? "";
}

function looksEnglish(text: string): boolean {
  return /\b(the|and|what|how|can|could|would|today|please|help|with)\b/i.test(text);
}

export function useEconomyVoice(options: EconomyVoiceOptions) {
  const [state, setState] = useState<EconomyVoiceState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechRunRef = useRef(0);
  const callbackRef = useRef(options.onTranscript);
  const errorRef = useRef(options.onError);

  useEffect(() => {
    callbackRef.current = options.onTranscript;
    errorRef.current = options.onError;
  }, [options.onTranscript, options.onError]);

  const releaseMicrophone = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    animationRef.current = null;
    timeoutRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  const speak = useCallback(
    async (text: string, transcript = "") => {
      const cleanText = text.replace(/[*#_`]/g, "").trim();
      if (!cleanText) {
        setState("idle");
        return;
      }
      const speechRun = ++speechRunRef.current;
      localAudioRef.current?.pause();
      localAudioRef.current = null;
      if (!("speechSynthesis" in window) || !text.trim()) {
        setState("idle");
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const language =
        options.language === "auto"
            ? looksEnglish(transcript) ? "en-US" : "pt-BR"
            : options.language;
      utterance.lang = language;
      let voices = window.speechSynthesis.getVoices();
      if (!voices.length) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        voices = window.speechSynthesis.getVoices();
      }
      const voice =
        voices.find((candidate) => candidate.voiceURI === options.localVoiceUri) ??
        voices.find((candidate) =>
          candidate.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase()) &&
          /daniel|antonio|ricardo|male|masculino|male/i.test(candidate.name)
        ) ??
        voices.find((candidate) => candidate.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase()));
      if (voice) utterance.voice = voice;
      utterance.rate = 0.98;
      utterance.pitch = 0.86;
      utterance.onend = () => {
        if (speechRunRef.current === speechRun) setState("idle");
      };
      utterance.onerror = () => {
        if (speechRunRef.current === speechRun) setState("idle");
      };
      setState("speaking");
      window.speechSynthesis.speak(utterance);
    },
    [options.language, options.localVoiceUri]
  );

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    speechRunRef.current += 1;
    if (state === "speaking") {
      localAudioRef.current?.pause();
      localAudioRef.current = null;
      window.speechSynthesis.cancel();
      setState("idle");
    }
  }, [state]);

  const start = useCallback(async () => {
    if (state !== "idle" && state !== "error") return;
    try {
      window.speechSynthesis?.cancel();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        releaseMicrophone();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 800) {
          setState("idle");
          return;
        }
        try {
          setState("transcribing");
          const result = await window.eco.transcribeAudio(await blob.arrayBuffer(), blob.type);
          const transcript = result.text.trim();
          if (!transcript) {
            setState("idle");
            return;
          }
          setState("thinking");
          const reply = await callbackRef.current(transcript);
          if (reply) speak(reply, transcript);
          else setState("idle");
        } catch (error) {
          setState("error");
          errorRef.current(error instanceof Error ? error.message : "A voz economica falhou.");
        }
      };

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const levels = new Uint8Array(analyser.fftSize);
      let heardSpeech = false;
      let silentSince = 0;
      const watchSilence = () => {
        if (recorder.state !== "recording") return;
        analyser.getByteTimeDomainData(levels);
        let energy = 0;
        for (const sample of levels) energy += Math.abs(sample - 128);
        const average = energy / levels.length;
        const now = performance.now();
        if (average > 4.5) {
          heardSpeech = true;
          silentSince = 0;
        } else if (heardSpeech) {
          if (!silentSince) silentSince = now;
          if (now - silentSince > 1750) {
            recorder.stop();
            return;
          }
        }
        animationRef.current = requestAnimationFrame(watchSilence);
      };

      recorder.start(250);
      setState("listening");
      animationRef.current = requestAnimationFrame(watchSilence);
      timeoutRef.current = window.setTimeout(
        () => recorder.state === "recording" && recorder.stop(),
        Math.max(5, Math.min(60, options.maxSeconds)) * 1000
      );
    } catch (error) {
      releaseMicrophone();
      setState("error");
      errorRef.current(
        error instanceof Error ? error.message : "Nao foi possivel acessar o microfone."
      );
    }
  }, [options.maxSeconds, releaseMicrophone, speak, state]);

  useEffect(
    () => () => {
      recorderRef.current?.state === "recording" && recorderRef.current.stop();
      releaseMicrophone();
      window.speechSynthesis?.cancel();
      localAudioRef.current?.pause();
    },
    [releaseMicrophone]
  );

  return { state, start, stop };
}
