import { desktopCapturer } from "electron";

export async function captureScreen(): Promise<string> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    if (!sources || sources.length === 0) {
      throw new Error("Nenhuma tela encontrada para capturar.");
    }

    return sources[0].thumbnail.toDataURL();
  } catch (error) {
    console.error("Erro ao capturar a tela do Windows:", error);
    throw new Error("Fifones não conseguiu acessar a tela.");
  }
}
