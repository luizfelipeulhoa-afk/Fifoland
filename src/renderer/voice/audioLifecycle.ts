type TrackContainer = Pick<MediaStream, "getTracks">;
type VoiceAudioElement = Pick<HTMLAudioElement, "pause" | "remove"> & {
  srcObject: MediaProvider | null;
};

export function stopMediaStreamTracks(stream?: TrackContainer | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function releaseVoiceAudioElement(audio?: VoiceAudioElement | null): void {
  if (!audio) return;
  audio.pause();
  audio.srcObject = null;
  audio.remove();
}

export function describeVoiceMediaError(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "A permissão do microfone foi negada. Você pode continuar usando o Fifones sem voz.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "Nenhum microfone disponível foi encontrado.";
  }
  return error instanceof Error ? error.message : "Não foi possível abrir o microfone.";
}
