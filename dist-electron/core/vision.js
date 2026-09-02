"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureScreen = captureScreen;
const electron_1 = require("electron");
async function captureScreen() {
    try {
        const sources = await electron_1.desktopCapturer.getSources({
            types: ["screen"],
            thumbnailSize: { width: 1920, height: 1080 }
        });
        if (!sources || sources.length === 0) {
            throw new Error("Nenhuma tela encontrada para capturar.");
        }
        return sources[0].thumbnail.toDataURL();
    }
    catch (error) {
        console.error("Erro ao capturar a tela do Windows:", error);
        throw new Error("Fifones não conseguiu acessar a tela.");
    }
}
