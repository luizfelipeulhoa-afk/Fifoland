import { describe, expect, it, vi } from "vitest";
import {
  describeVoiceMediaError,
  releaseVoiceAudioElement,
  stopMediaStreamTracks
} from "../src/renderer/voice/audioLifecycle";

describe("voice audio lifecycle", () => {
  it("explains denied and unavailable microphone access", () => {
    expect(describeVoiceMediaError(new DOMException("denied", "NotAllowedError"))).toContain(
      "permissão do microfone foi negada"
    );
    expect(describeVoiceMediaError(new DOMException("missing", "NotFoundError"))).toContain(
      "Nenhum microfone"
    );
  });

  it("stops every media track during teardown", () => {
    const first = { stop: vi.fn() };
    const second = { stop: vi.fn() };
    stopMediaStreamTracks({ getTracks: () => [first, second] as unknown as MediaStreamTrack[] });
    expect(first.stop).toHaveBeenCalledOnce();
    expect(second.stop).toHaveBeenCalledOnce();
  });

  it("detaches and removes the assistant audio element", () => {
    const audio = { pause: vi.fn(), remove: vi.fn(), srcObject: {} as MediaProvider };
    releaseVoiceAudioElement(audio);
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.remove).toHaveBeenCalledOnce();
    expect(audio.srcObject).toBeNull();
  });
});
