import { useEffect, useState } from "react";

export type WakePhraseState =
  | "off"
  | "starting"
  | "listening"
  | "heard"
  | "unsupported"
  | "error";

type WakePhraseOptions = {
  enabled: boolean;
  suspended?: boolean;
  onWake: () => void;
};

export function useWakePhrase({
  enabled,
  suspended = false
}: WakePhraseOptions) {
  const [state, setState] = useState<WakePhraseState>("off");

  useEffect(() => {
    setState(enabled && !suspended ? "unsupported" : "off");
  }, [enabled, suspended]);

  return {
    // Browser speech recognition may send microphone data to a remote service.
    // Keep wake detection unavailable until the bundled Vosk model is validated.
    supported: false,
    state
  };
}
