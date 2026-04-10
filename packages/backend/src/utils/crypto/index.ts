import { Buffer } from "buffer";
import { randomBytes } from "crypto";

import { aesCfbDecrypt, aesCtrDecrypt } from "./aes";
import {
  base64ToUint8,
  deserializeKeyPair,
  exportPublicKeyPEM,
  generateRSAKeyPair,
  type RSAKeyPair,
  rsaOaepDecrypt,
  type SerializedRSAKeyPair,
  serializeKeyPair,
} from "./rsa";

let keyPair: RSAKeyPair | undefined;

export function initializeKeys(): void {
  if (keyPair !== undefined) return;
  keyPair = generateRSAKeyPair();
}

export function isKeysInitialized(): boolean {
  return keyPair !== undefined;
}

export function getEncodedPublicKey(): string {
  if (keyPair === undefined) throw new Error("Keys not initialized");
  return Buffer.from(exportPublicKeyPEM(keyPair.publicKey)).toString("base64");
}

export function exportKeys(): SerializedRSAKeyPair | undefined {
  return keyPair !== undefined ? serializeKeyPair(keyPair) : undefined;
}

export function importKeys(serialized: SerializedRSAKeyPair): void {
  keyPair = deserializeKeyPair(serialized);
}

function normalizeAesKey(raw: Uint8Array): Uint8Array {
  if (raw.length === 32) return raw;
  const key = new Uint8Array(32);
  key.set(raw.length > 32 ? raw.slice(0, 32) : raw);
  return key;
}

function bytesToString(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("utf-8");
}

export function decryptMessage(
  rsaEncryptedKey: string,
  encryptedMessage: string,
): string {
  if (keyPair === undefined) throw new Error("Keys not initialized");

  const cleanMessage = encryptedMessage.replace(/[\r\n\s]+/g, "");
  const aesKeyRaw = rsaOaepDecrypt(
    base64ToUint8(rsaEncryptedKey),
    keyPair.privateKey,
  );
  const aesKey = normalizeAesKey(aesKeyRaw);
  const msgBytes = base64ToUint8(cleanMessage);
  const iv = msgBytes.slice(0, 16);
  const ciphertext = msgBytes.slice(16);

  try {
    const ctrResult = bytesToString(aesCtrDecrypt(aesKey, iv, ciphertext));
    JSON.parse(ctrResult);
    return ctrResult;
    // eslint-disable-next-line no-empty
  } catch {}

  return bytesToString(aesCfbDecrypt(aesKey, iv, ciphertext));
}

export async function ensureKeysWithStorage(
  loadFn: () => string | undefined,
  saveFn: (data: string) => Promise<void>,
): Promise<void> {
  if (keyPair !== undefined) return;

  const stored = loadFn();
  if (stored !== undefined && stored !== "") {
    try {
      const parsed = JSON.parse(stored) as SerializedRSAKeyPair;
      keyPair = deserializeKeyPair(parsed);
      return;
      // eslint-disable-next-line no-empty
    } catch {}
  }

  const generated = generateRSAKeyPair();
  await saveFn(JSON.stringify(serializeKeyPair(generated)));
  keyPair = generated;
}

export function generateRandomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i]! % chars.length];
  }
  return result;
}
