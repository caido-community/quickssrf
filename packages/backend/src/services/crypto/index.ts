/**
 * Native crypto implementation for Caido backend
 * No external dependencies - pure JavaScript implementations
 */

import { Buffer } from "buffer";
import { randomBytes } from "crypto";

import { aesCfbDecrypt } from "./aes";
import {
  base64ToUint8Array,
  exportPublicKeyPEM,
  generateRSAKeyPair,
  type RSAKeyPair,
  rsaOaepDecrypt,
  type RSAPrivateKey,
  type RSAPublicKey,
} from "./rsa";

/**
 * Serializable RSA key pair for persistence
 */
export interface SerializedRSAKeyPair {
  publicKey: {
    n: string;
    e: string;
  };
  privateKey: {
    n: string;
    d: string;
    p: string;
    q: string;
    dp: string;
    dq: string;
    qi: string;
  };
}

/**
 * Convert Uint8Array to UTF-8 string
 */
function uint8ArrayToString(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i]!);
  }
  // Handle UTF-8 multi-byte characters
  try {
    return decodeURIComponent(escape(result));
  } catch {
    return result;
  }
}

// Store for RSA key pair
let keyPair: RSAKeyPair | undefined;
let keysInitialized = false;

/**
 * Initialize RSA-2048 key pair with OAEP padding and SHA-256
 */
export function initializeRSAKeys(): void {
  if (keysInitialized) {
    return;
  }

  keyPair = generateRSAKeyPair();
  keysInitialized = true;
}

/**
 * Check if keys are initialized
 */
export function areKeysInitialized(): boolean {
  return keysInitialized;
}

/**
 * Export RSA key pair to serializable format
 */
export function exportRSAKeyPair(): SerializedRSAKeyPair | undefined {
  if (!keyPair) {
    return undefined;
  }

  return {
    publicKey: {
      n: keyPair.publicKey.n.toString(),
      e: keyPair.publicKey.e.toString(),
    },
    privateKey: {
      n: keyPair.privateKey.n.toString(),
      d: keyPair.privateKey.d.toString(),
      p: keyPair.privateKey.p.toString(),
      q: keyPair.privateKey.q.toString(),
      dp: keyPair.privateKey.dp.toString(),
      dq: keyPair.privateKey.dq.toString(),
      qi: keyPair.privateKey.qi.toString(),
    },
  };
}

/**
 * Import RSA key pair from serialized format
 */
export function importRSAKeyPair(serialized: SerializedRSAKeyPair): void {
  const publicKey: RSAPublicKey = {
    n: BigInt(serialized.publicKey.n),
    e: BigInt(serialized.publicKey.e),
  };

  const privateKey: RSAPrivateKey = {
    n: BigInt(serialized.privateKey.n),
    d: BigInt(serialized.privateKey.d),
    p: BigInt(serialized.privateKey.p),
    q: BigInt(serialized.privateKey.q),
    dp: BigInt(serialized.privateKey.dp),
    dq: BigInt(serialized.privateKey.dq),
    qi: BigInt(serialized.privateKey.qi),
  };

  keyPair = { publicKey, privateKey };
  keysInitialized = true;
}

/**
 * Get the private key
 */
export function getPrivateKey(): RSAPrivateKey | undefined {
  return keyPair?.privateKey;
}

/**
 * Encode the public key in the format expected by Interactsh
 * Returns base64 encoded PEM format
 */
export function encodePublicKey(): string {
  if (!keyPair) {
    throw new Error("Keys not initialized. Call initializeRSAKeys() first.");
  }

  const pemKey = exportPublicKeyPEM(keyPair.publicKey);
  return Buffer.from(pemKey).toString("base64");
}

/**
 * Decrypt data using RSA-OAEP with SHA-256
 */
export function decryptRSA(encodedKey: string): Uint8Array {
  if (!keyPair) {
    throw new Error("Keys not initialized. Call initializeRSAKeys() first.");
  }

  const encryptedData = base64ToUint8Array(encodedKey);
  return rsaOaepDecrypt(encryptedData, keyPair.privateKey);
}

/**
 * Decrypt a message from Interactsh
 * The key is RSA-encrypted, the message is AES-CFB encrypted
 * Format: IV (16 bytes) + ciphertext
 */
export function decryptMessage(key: string, secureMessage: string): string {
  if (!keyPair) {
    throw new Error("Keys not initialized. Call initializeRSAKeys() first.");
  }

  // Step 1: Decrypt the AES key using RSA-OAEP
  const encryptedKeyBytes = base64ToUint8Array(key);
  const decryptedKey = rsaOaepDecrypt(encryptedKeyBytes, keyPair.privateKey);

  // Step 2: Decode the secure message from base64
  const secureMessageBuffer = base64ToUint8Array(secureMessage);

  // Step 3: Extract IV (first 16 bytes) and ciphertext (rest)
  const iv = secureMessageBuffer.slice(0, 16);
  const ciphertext = secureMessageBuffer.slice(16);

  // Step 4: Decrypt using AES-256-CFB
  // Ensure key is 32 bytes for AES-256
  let aesKey: Uint8Array;
  if (decryptedKey.length === 32) {
    aesKey = decryptedKey;
  } else if (decryptedKey.length < 32) {
    // Pad with zeros if key is shorter
    aesKey = new Uint8Array(32);
    aesKey.set(decryptedKey);
  } else {
    // Truncate if key is longer
    aesKey = decryptedKey.slice(0, 32);
  }

  const decrypted = aesCfbDecrypt(aesKey, iv, ciphertext);

  // Convert to UTF-8 string
  return uint8ArrayToString(decrypted);
}

/**
 * Generate a random string of specified length
 * Used for correlation ID and secret key generation
 */
export function generateRandomString(
  length: number,
  lettersOnly: boolean = false,
): string {
  const characters = lettersOnly
    ? "abcdefghijklmnopqrstuvwxyz"
    : "abcdefghijklmnopqrstuvwxyz0123456789";

  const bytes = randomBytes(length);
  let result = "";

  for (let i = 0; i < length; i++) {
    result += characters[bytes[i]! % characters.length];
  }

  return result;
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

/**
 * Convert Base64 string to Uint8Array
 */
export function base64ToBuffer(base64: string): Uint8Array {
  return base64ToUint8Array(base64);
}
