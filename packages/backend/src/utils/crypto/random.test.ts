import { describe, expect, it } from "vitest";

import { generateRandomString, randomFrom } from "./random";

describe("randomFrom", () => {
  it("returns a string of the requested length from the alphabet", () => {
    const alphabet = "0123456789abcdefghijklmnopqrstuv";
    const result = randomFrom(alphabet, 20);

    expect(result).toHaveLength(20);
    expect([...result].every((char) => alphabet.includes(char))).toBe(true);
  });

  it("uses a different alphabet without mixing in outside characters", () => {
    const alphabet = "ybndrfg8ejkmcpqxot1uwisza345h769";
    const result = randomFrom(alphabet, 13);

    expect(result).toHaveLength(13);
    expect(/^[ybndrfg8ejkmcpqxot1uwisza345h769]+$/.test(result)).toBe(true);
    expect(/[02lv]/.test(result)).toBe(false);
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
