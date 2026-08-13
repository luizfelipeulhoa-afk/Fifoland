import { useEffect, useMemo, useState } from "react";
import { resolveVoiceQuality, supportsWebGl } from "./quality";
import { toFifonesVoiceState, VOICE_STATE_LABELS } from "./types";

export function useVoiceVisualController(rawState: string, disabled: boolean) {
  const [visible, setVisible] = useState(() => !document.hidden);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const quality = useMemo(resolveVoiceQuality, []);
  const webGlAvailable = useMemo(supportsWebGl, []);
  const state = toFifonesVoiceState(rawState, disabled);

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return {
    state,
    label: VOICE_STATE_LABELS[state],
    visible,
    reducedMotion,
    quality,
    webGlAvailable
  };
}
