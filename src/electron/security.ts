import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { safeStorage } from "electron";

const MAGIC = Buffer.from("ECO1");

export class SecureKeyStore {
  private key?: Buffer;

  constructor(private readonly userDataPath: string) {}

  isAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  async getKey(): Promise<Buffer> {
    if (this.key) return this.key;
    if (!this.isAvailable()) {
      throw new Error(
        "A proteção criptográfica do Windows não está disponível nesta sessão."
      );
    }

    const keyPath = path.join(this.userDataPath, "eco.key");
    try {
      const protectedValue = await fs.readFile(keyPath);
      const base64Key = safeStorage.decryptString(protectedValue);
      this.key = Buffer.from(base64Key, "base64");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
      this.key = randomBytes(32);
      const protectedValue = safeStorage.encryptString(this.key.toString("base64"));
      await fs.mkdir(this.userDataPath, { recursive: true });
      await fs.writeFile(keyPath, protectedValue, { mode: 0o600 });
    }
    return this.key;
  }

  clearFromMemory(): void {
    this.key?.fill(0);
    this.key = undefined;
  }
}

export async function encryptBytes(plaintext: Uint8Array, key: Buffer): Promise<Buffer> {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(plaintext)),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, iv, tag, ciphertext]);
}

export async function decryptBytes(payload: Buffer, key: Buffer): Promise<Buffer> {
  if (!payload.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("O cofre de memória não tem um formato reconhecido.");
  }
  const ivStart = MAGIC.length;
  const tagStart = ivStart + 12;
  const ciphertextStart = tagStart + 16;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    payload.subarray(ivStart, tagStart)
  );
  decipher.setAuthTag(payload.subarray(tagStart, ciphertextStart));
  return Buffer.concat([
    decipher.update(payload.subarray(ciphertextStart)),
    decipher.final()
  ]);
}
