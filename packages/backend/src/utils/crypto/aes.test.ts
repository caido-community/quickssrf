import { Buffer } from "buffer";
import { randomBytes } from "crypto";

import { describe, expect, it } from "vitest";

import { aesCfbDecrypt, aesCtrDecrypt } from "./aes";

describe("aesCtrDecrypt", () => {
  it("CTR roundtrip: encrypt then decrypt returns original", () => {
    const key = randomBytes(32);
    const iv = randomBytes(16);
    const plaintext = Buffer.from("Hello, Interactsh!");

    const encrypted = aesCtrDecrypt(key, iv, plaintext);
    const decrypted = aesCtrDecrypt(key, iv, encrypted);

    expect(Buffer.from(decrypted).toString("utf-8")).toBe("Hello, Interactsh!");
  });

  it("handles empty data", () => {
    const key = randomBytes(32);
    const iv = randomBytes(16);
    const result = aesCtrDecrypt(key, iv, new Uint8Array(0));
    expect(result.length).toBe(0);
  });

  it("handles non-aligned block sizes", () => {
    const key = randomBytes(32);
    const iv = randomBytes(16);
    const plaintext = randomBytes(37);

    const encrypted = aesCtrDecrypt(key, iv, plaintext);
    const decrypted = aesCtrDecrypt(key, iv, encrypted);

    expect(Buffer.from(decrypted)).toEqual(Buffer.from(plaintext));
  });

  it("different keys produce different ciphertext", () => {
    const iv = randomBytes(16);
    const plaintext = Buffer.from("same data");

    const enc1 = aesCtrDecrypt(randomBytes(32), iv, plaintext);
    const enc2 = aesCtrDecrypt(randomBytes(32), iv, plaintext);

    expect(Buffer.from(enc1)).not.toEqual(Buffer.from(enc2));
  });

  it("handles large multi-block data", () => {
    const key = randomBytes(32);
    const iv = randomBytes(16);
    const plaintext = randomBytes(1024);

    const encrypted = aesCtrDecrypt(key, iv, plaintext);
    const decrypted = aesCtrDecrypt(key, iv, encrypted);

    expect(Buffer.from(decrypted)).toEqual(Buffer.from(plaintext));
  });
});

describe("aesCfbDecrypt", () => {
  it("returns data of same length as input", () => {
    const key = randomBytes(32);
    const iv = randomBytes(16);
    const ciphertext = randomBytes(48);

    const result = aesCfbDecrypt(key, iv, ciphertext);
    expect(result.length).toBe(48);
  });

  it("different keys produce different plaintext", () => {
    const iv = randomBytes(16);
    const ciphertext = randomBytes(32);

    const dec1 = aesCfbDecrypt(randomBytes(32), iv, ciphertext);
    const dec2 = aesCfbDecrypt(randomBytes(32), iv, ciphertext);

    expect(Buffer.from(dec1)).not.toEqual(Buffer.from(dec2));
  });

  it("handles non-aligned block sizes", () => {
    const key = randomBytes(32);
    const iv = randomBytes(16);
    const ciphertext = randomBytes(37);

    const result = aesCfbDecrypt(key, iv, ciphertext);
    expect(result.length).toBe(37);
  });
});
