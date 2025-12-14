/**
 * Pure JavaScript RSA-OAEP implementation for Caido backend
 * Uses native BigInt for large number arithmetic
 */

import { Buffer } from "buffer";
import { createHash, randomBytes } from "crypto";

/**
 * RSA Key Pair interface
 */
export interface RSAKeyPair {
  publicKey: RSAPublicKey;
  privateKey: RSAPrivateKey;
}

export interface RSAPublicKey {
  n: bigint; // modulus
  e: bigint; // public exponent
}

export interface RSAPrivateKey {
  n: bigint; // modulus
  d: bigint; // private exponent
  p: bigint; // prime 1
  q: bigint; // prime 2
  dp: bigint; // d mod (p-1)
  dq: bigint; // d mod (q-1)
  qi: bigint; // q^(-1) mod p
}

/**
 * Convert Uint8Array to BigInt
 */
function uint8ArrayToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}

/**
 * Convert BigInt to Uint8Array with specified length
 */
function bigIntToUint8Array(num: bigint, length: number): Uint8Array {
  const result = new Uint8Array(length);
  let temp = num;
  for (let i = length - 1; i >= 0; i--) {
    result[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }
  return result;
}

/**
 * Miller-Rabin primality test
 */
function isProbablePrime(n: bigint, k: number = 20): boolean {
  if (n < 2n) return false;
  if (n === 2n || n === 3n) return true;
  if (n % 2n === 0n) return false;

  // Write n-1 as 2^r * d
  let r = 0n;
  let d = n - 1n;
  while (d % 2n === 0n) {
    d /= 2n;
    r++;
  }

  // Witness loop
  witnessLoop: for (let i = 0; i < k; i++) {
    // Random a in [2, n-2]
    const aBytes = randomBytes(32);
    const a = (uint8ArrayToBigInt(aBytes) % (n - 4n)) + 2n;

    let x = modPow(a, d, n);

    if (x === 1n || x === n - 1n) continue;

    for (let j = 0n; j < r - 1n; j++) {
      x = modPow(x, 2n, n);
      if (x === n - 1n) continue witnessLoop;
    }

    return false;
  }

  return true;
}

/**
 * Modular exponentiation using square-and-multiply
 */
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base = base % mod;

  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % mod;
    }
    exp = exp >> 1n;
    base = (base * base) % mod;
  }

  return result;
}

/**
 * Extended Euclidean Algorithm
 */
function extendedGcd(
  a: bigint,
  b: bigint,
): { gcd: bigint; x: bigint; y: bigint } {
  if (a === 0n) {
    return { gcd: b, x: 0n, y: 1n };
  }

  const { gcd, x, y } = extendedGcd(b % a, a);
  return {
    gcd,
    x: y - (b / a) * x,
    y: x,
  };
}

/**
 * Modular multiplicative inverse
 */
function modInverse(a: bigint, m: bigint): bigint {
  const { gcd, x } = extendedGcd(a % m, m);
  if (gcd !== 1n) {
    throw new Error("Modular inverse does not exist");
  }
  return ((x % m) + m) % m;
}

/**
 * Generate a random prime of specified bit length
 */
function generatePrime(bits: number): bigint {
  while (true) {
    const bytes = randomBytes(Math.ceil(bits / 8));

    // Set the high bit to ensure the number has the right bit length
    bytes[0]! |= 0x80;

    // Set the low bit to ensure the number is odd
    bytes[bytes.length - 1]! |= 0x01;

    const candidate = uint8ArrayToBigInt(bytes);

    if (isProbablePrime(candidate)) {
      return candidate;
    }
  }
}

/**
 * Generate RSA-2048 key pair
 */
export function generateRSAKeyPair(): RSAKeyPair {
  const bits = 1024; // Each prime is 1024 bits for RSA-2048

  // Generate two distinct primes
  const p = generatePrime(bits);
  let q = generatePrime(bits);

  while (p === q) {
    q = generatePrime(bits);
  }

  const n = p * q;
  const phi = (p - 1n) * (q - 1n);

  // Standard public exponent
  const e = 65537n;

  // Private exponent
  const d = modInverse(e, phi);

  // CRT components for faster decryption
  const dp = d % (p - 1n);
  const dq = d % (q - 1n);
  const qi = modInverse(q, p);

  return {
    publicKey: { n, e },
    privateKey: { n, d, p, q, dp, dq, qi },
  };
}

/**
 * MGF1 (Mask Generation Function) using SHA-256
 */
function mgf1Sha256(seed: Uint8Array, length: number): Uint8Array {
  const result = new Uint8Array(length);
  const hashLen = 32; // SHA-256 output length
  let offset = 0;
  let counter = 0;

  while (offset < length) {
    const counterBytes = new Uint8Array(4);
    counterBytes[0] = (counter >> 24) & 0xff;
    counterBytes[1] = (counter >> 16) & 0xff;
    counterBytes[2] = (counter >> 8) & 0xff;
    counterBytes[3] = counter & 0xff;

    const data = new Uint8Array(seed.length + 4);
    data.set(seed);
    data.set(counterBytes, seed.length);

    const hash = createHash("sha256").update(data).digest();
    const copyLen = Math.min(hashLen, length - offset);

    for (let i = 0; i < copyLen; i++) {
      result[offset + i] = hash[i]!;
    }

    offset += copyLen;
    counter++;
  }

  return result;
}

/**
 * SHA-256 hash
 */
function sha256(data: Uint8Array): Uint8Array {
  const hash = createHash("sha256").update(data).digest();
  return new Uint8Array(hash);
}

/**
 * OAEP decoding (RSA-OAEP with SHA-256)
 */
function oaepDecode(
  em: Uint8Array,
  label: Uint8Array = new Uint8Array(0),
): Uint8Array {
  const hLen = 32; // SHA-256 hash length
  const k = em.length; // Key length in bytes

  if (k < 2 * hLen + 2) {
    throw new Error("Decryption error: message too short");
  }

  // Split EM into Y || maskedSeed || maskedDB
  const y = em[0];
  const maskedSeed = em.slice(1, 1 + hLen);
  const maskedDB = em.slice(1 + hLen);

  // Generate seedMask
  const seedMask = mgf1Sha256(maskedDB, hLen);

  // Recover seed
  const seed = new Uint8Array(hLen);
  for (let i = 0; i < hLen; i++) {
    seed[i] = maskedSeed[i]! ^ seedMask[i]!;
  }

  // Generate dbMask
  const dbMask = mgf1Sha256(seed, k - hLen - 1);

  // Recover DB
  const db = new Uint8Array(k - hLen - 1);
  for (let i = 0; i < db.length; i++) {
    db[i] = maskedDB[i]! ^ dbMask[i]!;
  }

  // Split DB into lHash' || PS || 0x01 || M
  const lHash = sha256(label);
  const lHashPrime = db.slice(0, hLen);

  // Verify lHash
  let valid = y === 0;
  for (let i = 0; i < hLen; i++) {
    if (lHash[i] !== lHashPrime[i]) {
      valid = false;
    }
  }

  // Find the 0x01 separator
  let separatorIndex = -1;
  for (let i = hLen; i < db.length; i++) {
    if (db[i] === 0x01) {
      separatorIndex = i;
      break;
    } else if (db[i] !== 0x00) {
      valid = false;
      break;
    }
  }

  if (!valid || separatorIndex === -1) {
    throw new Error("Decryption error: invalid OAEP padding");
  }

  // Extract message
  return db.slice(separatorIndex + 1);
}

/**
 * RSA decryption using CRT for efficiency
 */
function rsaDecryptRaw(ciphertext: bigint, privateKey: RSAPrivateKey): bigint {
  const { p, q, dp, dq, qi } = privateKey;

  // CRT decryption
  const m1 = modPow(ciphertext % p, dp, p);
  const m2 = modPow(ciphertext % q, dq, q);

  let h = (qi * ((m1 - m2 + p) % p)) % p;
  if (h < 0n) h += p;

  return m2 + h * q;
}

/**
 * RSA-OAEP decryption with SHA-256
 */
export function rsaOaepDecrypt(
  ciphertext: Uint8Array,
  privateKey: RSAPrivateKey,
  label: Uint8Array = new Uint8Array(0),
): Uint8Array {
  const k = Math.ceil(bigIntLength(privateKey.n) / 8);

  if (ciphertext.length !== k) {
    throw new Error(
      `Decryption error: ciphertext length (${ciphertext.length}) != key length (${k})`,
    );
  }

  // Convert ciphertext to integer
  const c = uint8ArrayToBigInt(ciphertext);

  // RSA decryption
  const m = rsaDecryptRaw(c, privateKey);

  // Convert to byte array
  const em = bigIntToUint8Array(m, k);

  // OAEP decode
  return oaepDecode(em, label);
}

/**
 * Get bit length of a BigInt
 */
function bigIntLength(n: bigint): number {
  let bits = 0;
  let temp = n;
  while (temp > 0n) {
    bits++;
    temp >>= 1n;
  }
  return bits;
}

/**
 * Export public key to SPKI PEM format
 */
export function exportPublicKeyPEM(publicKey: RSAPublicKey): string {
  // ASN.1 DER encoding of RSA public key in SPKI format
  const nBytes = bigIntToUint8Array(publicKey.n, 256); // 2048 bits = 256 bytes
  const eBytes = bigIntToUint8Array(publicKey.e, 3); // 65537 fits in 3 bytes

  // Build the RSAPublicKey SEQUENCE
  const rsaPublicKey = asn1Sequence([asn1Integer(nBytes), asn1Integer(eBytes)]);

  // OID for rsaEncryption: 1.2.840.113549.1.1.1
  const rsaOid = new Uint8Array([
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
  ]);

  // AlgorithmIdentifier SEQUENCE
  const algorithmIdentifier = asn1Sequence([
    rsaOid,
    new Uint8Array([0x05, 0x00]),
  ]); // NULL

  // BIT STRING wrapper for the public key
  const bitString = asn1BitString(rsaPublicKey);

  // SubjectPublicKeyInfo SEQUENCE
  const spki = asn1Sequence([algorithmIdentifier, bitString]);

  // Convert to base64 PEM
  const base64 = uint8ArrayToBase64(spki);
  const lines = base64.match(/.{1,64}/g) || [];

  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

/**
 * ASN.1 DER encoding helpers
 */
function asn1Length(length: number): Uint8Array {
  if (length < 128) {
    return new Uint8Array([length]);
  } else if (length < 256) {
    return new Uint8Array([0x81, length]);
  } else if (length < 65536) {
    return new Uint8Array([0x82, (length >> 8) & 0xff, length & 0xff]);
  } else {
    throw new Error("Length too long for ASN.1 encoding");
  }
}

function asn1Integer(bytes: Uint8Array): Uint8Array {
  // Remove leading zeros, but keep one if the high bit is set
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) {
    start++;
  }

  // Add a leading zero if high bit is set (to indicate positive number)
  const needsLeadingZero = (bytes[start]! & 0x80) !== 0;
  const contentLength = bytes.length - start + (needsLeadingZero ? 1 : 0);

  const lengthBytes = asn1Length(contentLength);
  const result = new Uint8Array(1 + lengthBytes.length + contentLength);

  result[0] = 0x02; // INTEGER tag
  result.set(lengthBytes, 1);

  let offset = 1 + lengthBytes.length;
  if (needsLeadingZero) {
    result[offset] = 0x00;
    offset++;
  }
  result.set(bytes.slice(start), offset);

  return result;
}

function asn1Sequence(elements: Uint8Array[]): Uint8Array {
  const totalLength = elements.reduce((sum, el) => sum + el.length, 0);
  const lengthBytes = asn1Length(totalLength);

  const result = new Uint8Array(1 + lengthBytes.length + totalLength);
  result[0] = 0x30; // SEQUENCE tag
  result.set(lengthBytes, 1);

  let offset = 1 + lengthBytes.length;
  for (const element of elements) {
    result.set(element, offset);
    offset += element.length;
  }

  return result;
}

function asn1BitString(content: Uint8Array): Uint8Array {
  const contentLength = content.length + 1; // +1 for unused bits byte
  const lengthBytes = asn1Length(contentLength);

  const result = new Uint8Array(1 + lengthBytes.length + contentLength);
  result[0] = 0x03; // BIT STRING tag
  result.set(lengthBytes, 1);
  result[1 + lengthBytes.length] = 0x00; // 0 unused bits
  result.set(content, 2 + lengthBytes.length);

  return result;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Use Buffer from the buffer module for base64 encoding
  return Buffer.from(bytes).toString("base64");
}

/**
 * Parse a base64-encoded string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  // Use Buffer from the buffer module for base64 decoding
  const buffer = Buffer.from(base64, "base64");
  return new Uint8Array(buffer);
}
