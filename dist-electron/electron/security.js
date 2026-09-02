"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureKeyStore = void 0;
exports.encryptBytes = encryptBytes;
exports.decryptBytes = decryptBytes;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const electron_1 = require("electron");
const MAGIC = Buffer.from("ECO1");
class SecureKeyStore {
    userDataPath;
    key;
    constructor(userDataPath) {
        this.userDataPath = userDataPath;
    }
    isAvailable() {
        return electron_1.safeStorage.isEncryptionAvailable();
    }
    async getKey() {
        if (this.key)
            return this.key;
        if (!this.isAvailable()) {
            throw new Error("A proteção criptográfica do Windows não está disponível nesta sessão.");
        }
        const keyPath = node_path_1.default.join(this.userDataPath, "eco.key");
        try {
            const protectedValue = await node_fs_1.promises.readFile(keyPath);
            const base64Key = electron_1.safeStorage.decryptString(protectedValue);
            this.key = Buffer.from(base64Key, "base64");
        }
        catch (error) {
            const code = error.code;
            if (code !== "ENOENT")
                throw error;
            this.key = (0, node_crypto_1.randomBytes)(32);
            const protectedValue = electron_1.safeStorage.encryptString(this.key.toString("base64"));
            await node_fs_1.promises.mkdir(this.userDataPath, { recursive: true });
            await node_fs_1.promises.writeFile(keyPath, protectedValue, { mode: 0o600 });
        }
        return this.key;
    }
    clearFromMemory() {
        this.key?.fill(0);
        this.key = undefined;
    }
}
exports.SecureKeyStore = SecureKeyStore;
async function encryptBytes(plaintext, key) {
    const iv = (0, node_crypto_1.randomBytes)(12);
    const cipher = (0, node_crypto_1.createCipheriv)("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([
        cipher.update(Buffer.from(plaintext)),
        cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([MAGIC, iv, tag, ciphertext]);
}
async function decryptBytes(payload, key) {
    if (!payload.subarray(0, MAGIC.length).equals(MAGIC)) {
        throw new Error("O cofre de memória não tem um formato reconhecido.");
    }
    const ivStart = MAGIC.length;
    const tagStart = ivStart + 12;
    const ciphertextStart = tagStart + 16;
    const decipher = (0, node_crypto_1.createDecipheriv)("aes-256-gcm", key, payload.subarray(ivStart, tagStart));
    decipher.setAuthTag(payload.subarray(tagStart, ciphertextStart));
    return Buffer.concat([
        decipher.update(payload.subarray(ciphertextStart)),
        decipher.final()
    ]);
}
