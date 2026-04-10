import { Buffer } from "buffer";
import { createHash, randomBytes } from "crypto";

type RSAPublicKey = {
  n: bigint;
  e: bigint;
};

type RSAPrivateKey = {
  n: bigint;
  d: bigint;
  p: bigint;
  q: bigint;
  dp: bigint;
  dq: bigint;
  qi: bigint;
};

export type RSAKeyPair = {
  publicKey: RSAPublicKey;
  privateKey: RSAPrivateKey;
};

export type SerializedRSAKeyPair = {
  publicKey: { n: string; e: string };
  privateKey: {
    n: string;
    d: string;
    p: string;
    q: string;
    dp: string;
    dq: string;
    qi: string;
  };
};

function uint8ToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}

function bigIntToUint8(num: bigint, length: number): Uint8Array {
  const result = new Uint8Array(length);
  let temp = num;
  for (let i = length - 1; i >= 0; i--) {
    result[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }
  return result;
}

function bigIntBitLength(n: bigint): number {
  let bits = 0;
  let temp = n;
  while (temp > 0n) {
    bits++;
    temp >>= 1n;
  }
  return bits;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

function extendedGcd(
  a: bigint,
  b: bigint,
): { gcd: bigint; x: bigint; y: bigint } {
  if (a === 0n) return { gcd: b, x: 0n, y: 1n };
  const { gcd, x, y } = extendedGcd(b % a, a);
  return { gcd, x: y - (b / a) * x, y: x };
}

function modInverse(a: bigint, m: bigint): bigint {
  const { gcd, x } = extendedGcd(a % m, m);
  if (gcd !== 1n) throw new Error("Modular inverse does not exist");
  return ((x % m) + m) % m;
}

function isProbablePrime(n: bigint, k = 20): boolean {
  if (n < 2n) return false;
  if (n === 2n || n === 3n) return true;
  if (n % 2n === 0n) return false;

  let r = 0n;
  let d = n - 1n;
  while (d % 2n === 0n) {
    d /= 2n;
    r++;
  }

  witnessLoop: for (let i = 0; i < k; i++) {
    const aBytes = randomBytes(32);
    const a = (uint8ToBigInt(aBytes) % (n - 4n)) + 2n;
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

function generatePrime(bits: number): bigint {
  for (;;) {
    const bytes = randomBytes(Math.ceil(bits / 8));
    bytes[0]! |= 0x80;
    bytes[bytes.length - 1]! |= 0x01;
    const candidate = uint8ToBigInt(bytes);
    if (isProbablePrime(candidate)) return candidate;
  }
}

export function generateRSAKeyPair(): RSAKeyPair {
  const p = generatePrime(1024);
  let q = generatePrime(1024);
  while (p === q) q = generatePrime(1024);

  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  const e = 65537n;
  const d = modInverse(e, phi);

  return {
    publicKey: { n, e },
    privateKey: {
      n,
      d,
      p,
      q,
      dp: d % (p - 1n),
      dq: d % (q - 1n),
      qi: modInverse(q, p),
    },
  };
}

function mgf1Sha256(seed: Uint8Array, length: number): Uint8Array {
  const result = new Uint8Array(length);
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
    const copyLen = Math.min(32, length - offset);
    for (let i = 0; i < copyLen; i++) result[offset + i] = hash[i]!;
    offset += copyLen;
    counter++;
  }
  return result;
}

function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash("sha256").update(data).digest());
}

function oaepDecode(
  em: Uint8Array,
  label: Uint8Array = new Uint8Array(0),
): Uint8Array {
  const hLen = 32;
  const k = em.length;
  if (k < 2 * hLen + 2) throw new Error("Decryption error: message too short");

  const y = em[0];
  const maskedSeed = em.slice(1, 1 + hLen);
  const maskedDB = em.slice(1 + hLen);

  const seed = new Uint8Array(hLen);
  const seedMask = mgf1Sha256(maskedDB, hLen);
  for (let i = 0; i < hLen; i++) seed[i] = maskedSeed[i]! ^ seedMask[i]!;

  const db = new Uint8Array(k - hLen - 1);
  const dbMask = mgf1Sha256(seed, k - hLen - 1);
  for (let i = 0; i < db.length; i++) db[i] = maskedDB[i]! ^ dbMask[i]!;

  const lHash = sha256(label);
  let valid = y === 0;
  for (let i = 0; i < hLen; i++) {
    if (lHash[i] !== db[i]) valid = false;
  }

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
  return db.slice(separatorIndex + 1);
}

export function rsaOaepDecrypt(
  ciphertext: Uint8Array,
  privateKey: RSAPrivateKey,
): Uint8Array {
  const k = Math.ceil(bigIntBitLength(privateKey.n) / 8);
  if (ciphertext.length !== k) {
    throw new Error(`Decryption error: ciphertext length mismatch`);
  }
  const c = uint8ToBigInt(ciphertext);
  const { p, q, dp, dq, qi } = privateKey;
  const m1 = modPow(c % p, dp, p);
  const m2 = modPow(c % q, dq, q);
  let h = (qi * ((m1 - m2 + p) % p)) % p;
  if (h < 0n) h += p;
  const m = m2 + h * q;
  return oaepDecode(bigIntToUint8(m, k));
}

function asn1Length(len: number): Uint8Array {
  if (len < 128) return new Uint8Array([len]);
  if (len < 256) return new Uint8Array([0x81, len]);
  return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
}

function asn1Integer(bytes: Uint8Array): Uint8Array {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) start++;
  const pad = (bytes[start]! & 0x80) !== 0;
  const contentLen = bytes.length - start + (pad ? 1 : 0);
  const lenBytes = asn1Length(contentLen);
  const result = new Uint8Array(1 + lenBytes.length + contentLen);
  result[0] = 0x02;
  result.set(lenBytes, 1);
  let offset = 1 + lenBytes.length;
  if (pad) {
    result[offset] = 0x00;
    offset++;
  }
  result.set(bytes.slice(start), offset);
  return result;
}

function asn1Sequence(elements: Uint8Array[]): Uint8Array {
  const total = elements.reduce((s, e) => s + e.length, 0);
  const lenBytes = asn1Length(total);
  const result = new Uint8Array(1 + lenBytes.length + total);
  result[0] = 0x30;
  result.set(lenBytes, 1);
  let offset = 1 + lenBytes.length;
  for (const el of elements) {
    result.set(el, offset);
    offset += el.length;
  }
  return result;
}

function asn1BitString(content: Uint8Array): Uint8Array {
  const contentLen = content.length + 1;
  const lenBytes = asn1Length(contentLen);
  const result = new Uint8Array(1 + lenBytes.length + contentLen);
  result[0] = 0x03;
  result.set(lenBytes, 1);
  result[1 + lenBytes.length] = 0x00;
  result.set(content, 2 + lenBytes.length);
  return result;
}

export function exportPublicKeyPEM(publicKey: RSAPublicKey): string {
  const nBytes = bigIntToUint8(publicKey.n, 256);
  const eBytes = bigIntToUint8(publicKey.e, 3);
  const rsaPubKey = asn1Sequence([asn1Integer(nBytes), asn1Integer(eBytes)]);
  const rsaOid = new Uint8Array([
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
  ]);
  const algId = asn1Sequence([rsaOid, new Uint8Array([0x05, 0x00])]);
  const spki = asn1Sequence([algId, asn1BitString(rsaPubKey)]);
  const b64 = Buffer.from(spki).toString("base64");
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

export function serializeKeyPair(kp: RSAKeyPair): SerializedRSAKeyPair {
  return {
    publicKey: { n: kp.publicKey.n.toString(), e: kp.publicKey.e.toString() },
    privateKey: {
      n: kp.privateKey.n.toString(),
      d: kp.privateKey.d.toString(),
      p: kp.privateKey.p.toString(),
      q: kp.privateKey.q.toString(),
      dp: kp.privateKey.dp.toString(),
      dq: kp.privateKey.dq.toString(),
      qi: kp.privateKey.qi.toString(),
    },
  };
}

export function deserializeKeyPair(s: SerializedRSAKeyPair): RSAKeyPair {
  return {
    publicKey: { n: BigInt(s.publicKey.n), e: BigInt(s.publicKey.e) },
    privateKey: {
      n: BigInt(s.privateKey.n),
      d: BigInt(s.privateKey.d),
      p: BigInt(s.privateKey.p),
      q: BigInt(s.privateKey.q),
      dp: BigInt(s.privateKey.dp),
      dq: BigInt(s.privateKey.dq),
      qi: BigInt(s.privateKey.qi),
    },
  };
}

export function base64ToUint8(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, "base64"));
}
