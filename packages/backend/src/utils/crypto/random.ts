import { randomBytes } from "crypto";

export const XID_ALPHABET = "0123456789abcdefghijklmnopqrstuv";
export const ZBASE32_ALPHABET = "ybndrfg8ejkmcpqxot1uwisza345h769";
export const DEFAULT_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function randomFrom(alphabet: string, length: number): string {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i]! % alphabet.length];
  }
  return result;
}

export function generateRandomString(length: number): string {
  return randomFrom(DEFAULT_ALPHABET, length);
}
