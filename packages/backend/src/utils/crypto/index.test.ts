import { Buffer } from "buffer";

import { beforeEach, describe, expect, it } from "vitest";

import {
  decryptMessage,
  exportKeys,
  generateRandomString,
  getEncodedPublicKey,
  importKeys,
  initializeKeys,
  isKeysInitialized,
} from ".";

describe("key management", { timeout: 30000 }, () => {
  it("initializes keys", () => {
    initializeKeys();
    expect(isKeysInitialized()).toBe(true);
  });

  it("is idempotent", () => {
    initializeKeys();
    const key1 = getEncodedPublicKey();
    initializeKeys();
    const key2 = getEncodedPublicKey();
    expect(key1).toBe(key2);
  });

  it("getEncodedPublicKey returns base64 after init", () => {
    initializeKeys();
    const key = getEncodedPublicKey();

    expect(key.length).toBeGreaterThan(100);
    const decoded = Buffer.from(key, "base64").toString("utf-8");
    expect(decoded).toContain("BEGIN PUBLIC KEY");
  });

  it("export/import roundtrips keys", () => {
    initializeKeys();
    const exported = exportKeys();
    expect(exported).toBeDefined();

    const pubKeyBefore = getEncodedPublicKey();
    importKeys(exported!);
    const pubKeyAfter = getEncodedPublicKey();

    expect(pubKeyAfter).toBe(pubKeyBefore);
  });

  it("exported keys are JSON-serializable", () => {
    initializeKeys();
    const exported = exportKeys();
    const json = JSON.stringify(exported);
    const parsed = JSON.parse(json);

    expect(parsed.publicKey.n).toBeDefined();
    expect(parsed.privateKey.d).toBeDefined();
  });
});

describe("generateRandomString", () => {
  it("returns string of correct length", () => {
    expect(generateRandomString(20).length).toBe(20);
    expect(generateRandomString(1).length).toBe(1);
    expect(generateRandomString(100).length).toBe(100);
  });

  it("only contains lowercase alphanumeric chars", () => {
    const result = generateRandomString(500);
    expect(/^[a-z0-9]+$/.test(result)).toBe(true);
  });

  it("generates different strings each time", () => {
    const results = new Set(
      Array.from({ length: 10 }, () => generateRandomString(20)),
    );
    expect(results.size).toBe(10);
  });
});

describe("decryptMessage", () => {
  beforeEach(() => {
    initializeKeys();
  });

  it("throws on invalid base64 input", () => {
    expect(() =>
      decryptMessage("not-valid-base64!!!", "also-invalid"),
    ).toThrow();
  });
});
