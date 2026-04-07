import { describe, expect, it } from "vitest";

import {
  base64ToUint8,
  deserializeKeyPair,
  exportPublicKeyPEM,
  generateRSAKeyPair,
  rsaOaepDecrypt,
  serializeKeyPair,
} from "./rsa";

describe("generateRSAKeyPair", () => {
  it("generates a valid 2048-bit key pair", () => {
    const kp = generateRSAKeyPair();

    expect(kp.publicKey.e).toBe(65537n);
    expect(kp.publicKey.n).toBeGreaterThan(0n);
    expect(kp.privateKey.d).toBeGreaterThan(0n);
    expect(kp.privateKey.p).toBeGreaterThan(0n);
    expect(kp.privateKey.q).toBeGreaterThan(0n);
    expect(kp.privateKey.p * kp.privateKey.q).toBe(kp.publicKey.n);
  });

  it("generates different keys each time", () => {
    const kp1 = generateRSAKeyPair();
    const kp2 = generateRSAKeyPair();

    expect(kp1.publicKey.n).not.toBe(kp2.publicKey.n);
  });
});

describe("exportPublicKeyPEM", () => {
  it("exports PEM with correct header and footer", () => {
    const kp = generateRSAKeyPair();
    const pem = exportPublicKeyPEM(kp.publicKey);

    expect(pem).toContain("-----BEGIN PUBLIC KEY-----");
    expect(pem).toContain("-----END PUBLIC KEY-----");
  });

  it("produces valid base64 content between markers", () => {
    const kp = generateRSAKeyPair();
    const pem = exportPublicKeyPEM(kp.publicKey);
    const lines = pem.split("\n");
    const b64Lines = lines.slice(1, -1);

    for (const line of b64Lines) {
      expect(line.length).toBeLessThanOrEqual(64);
      expect(/^[A-Za-z0-9+/=]+$/.test(line)).toBe(true);
    }
  });
});

describe("serializeKeyPair / deserializeKeyPair", () => {
  it("roundtrips correctly", () => {
    const original = generateRSAKeyPair();
    const serialized = serializeKeyPair(original);
    const restored = deserializeKeyPair(serialized);

    expect(restored.publicKey.n).toBe(original.publicKey.n);
    expect(restored.publicKey.e).toBe(original.publicKey.e);
    expect(restored.privateKey.d).toBe(original.privateKey.d);
    expect(restored.privateKey.p).toBe(original.privateKey.p);
    expect(restored.privateKey.q).toBe(original.privateKey.q);
    expect(restored.privateKey.dp).toBe(original.privateKey.dp);
    expect(restored.privateKey.dq).toBe(original.privateKey.dq);
    expect(restored.privateKey.qi).toBe(original.privateKey.qi);
  });

  it("serializes to JSON-safe strings", () => {
    const kp = generateRSAKeyPair();
    const serialized = serializeKeyPair(kp);
    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json);

    expect(parsed.publicKey.n).toBe(serialized.publicKey.n);
    expect(parsed.privateKey.d).toBe(serialized.privateKey.d);
  });
});

describe("base64ToUint8", () => {
  it("decodes base64 correctly", () => {
    const result = base64ToUint8("AQID");
    expect(result).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("handles empty string", () => {
    const result = base64ToUint8("");
    expect(result.length).toBe(0);
  });
});

describe("rsaOaepDecrypt", () => {
  it("throws on wrong ciphertext length", () => {
    const kp = generateRSAKeyPair();
    const badCiphertext = new Uint8Array(128);

    expect(() => rsaOaepDecrypt(badCiphertext, kp.privateKey)).toThrow(
      "ciphertext length mismatch",
    );
  });
});
