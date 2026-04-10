// prettier-ignore
const SBOX: number[] = [
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
];

// prettier-ignore
const RCON: number[] = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

function gmul(a: number, b: number): number {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}

function subBytes(s: number[][]): void {
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) s[i]![j] = SBOX[s[i]![j]!]!;
}

function shiftRows(s: number[][]): void {
  const t1 = s[1]![0];
  s[1]![0] = s[1]![1]!;
  s[1]![1] = s[1]![2]!;
  s[1]![2] = s[1]![3]!;
  s[1]![3] = t1!;
  const t2a = s[2]![0];
  const t2b = s[2]![1];
  s[2]![0] = s[2]![2]!;
  s[2]![1] = s[2]![3]!;
  s[2]![2] = t2a!;
  s[2]![3] = t2b!;
  const t3 = s[3]![3];
  s[3]![3] = s[3]![2]!;
  s[3]![2] = s[3]![1]!;
  s[3]![1] = s[3]![0]!;
  s[3]![0] = t3!;
}

function mixColumns(s: number[][]): void {
  for (let c = 0; c < 4; c++) {
    const a0 = s[0]![c]!,
      a1 = s[1]![c]!,
      a2 = s[2]![c]!,
      a3 = s[3]![c]!;
    s[0]![c] = gmul(a0, 2) ^ gmul(a1, 3) ^ a2 ^ a3;
    s[1]![c] = a0 ^ gmul(a1, 2) ^ gmul(a2, 3) ^ a3;
    s[2]![c] = a0 ^ a1 ^ gmul(a2, 2) ^ gmul(a3, 3);
    s[3]![c] = gmul(a0, 3) ^ a1 ^ a2 ^ gmul(a3, 2);
  }
}

function addRoundKey(s: number[][], rk: number[][]): void {
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) s[i]![j] = (s[i]![j] ?? 0) ^ (rk[i]![j] ?? 0);
}

function keyExpansion(key: Uint8Array): number[][][] {
  const Nk = 8,
    Nr = 14,
    Nb = 4;
  const w: number[][] = [];
  for (let i = 0; i < Nk; i++)
    w[i] = [key[4 * i]!, key[4 * i + 1]!, key[4 * i + 2]!, key[4 * i + 3]!];

  for (let i = Nk; i < Nb * (Nr + 1); i++) {
    const t = [...w[i - 1]!];
    if (i % Nk === 0) {
      const r = t[0]!;
      t[0] = t[1]!;
      t[1] = t[2]!;
      t[2] = t[3]!;
      t[3] = r;
      for (let j = 0; j < 4; j++) t[j] = SBOX[t[j]!]!;
      t[0] ^= RCON[i / Nk - 1]!;
    } else if (i % Nk === 4) {
      for (let j = 0; j < 4; j++) t[j] = SBOX[t[j]!]!;
    }
    w[i] = [];
    for (let j = 0; j < 4; j++) w[i]![j] = w[i - Nk]![j]! ^ t[j]!;
  }

  const roundKeys: number[][][] = [];
  for (let round = 0; round <= Nr; round++) {
    const rk: number[][] = [[], [], [], []];
    for (let col = 0; col < 4; col++) {
      const word = w[round * 4 + col]!;
      for (let row = 0; row < 4; row++) rk[row]![col] = word[row]!;
    }
    roundKeys.push(rk);
  }
  return roundKeys;
}

function aesEncryptBlock(
  block: Uint8Array,
  roundKeys: number[][][],
): Uint8Array {
  const s: number[][] = [[], [], [], []];
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) s[r]![c] = block[c * 4 + r]!;

  addRoundKey(s, roundKeys[0]!);
  for (let round = 1; round < 14; round++) {
    subBytes(s);
    shiftRows(s);
    mixColumns(s);
    addRoundKey(s, roundKeys[round]!);
  }
  subBytes(s);
  shiftRows(s);
  addRoundKey(s, roundKeys[14]!);

  const out = new Uint8Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) out[c * 4 + r] = s[r]![c]!;
  return out;
}

export function aesCtrDecrypt(
  key: Uint8Array,
  iv: Uint8Array,
  data: Uint8Array,
): Uint8Array {
  const roundKeys = keyExpansion(key);
  const output = new Uint8Array(data.length);
  const counter = new Uint8Array(iv);

  for (let i = 0; i < data.length; i += 16) {
    const ks = aesEncryptBlock(counter, roundKeys);
    const blockSize = Math.min(16, data.length - i);
    for (let j = 0; j < blockSize; j++) output[i + j] = data[i + j]! ^ ks[j]!;
    for (let k = 15; k >= 0; k--) {
      if (counter[k] === 255) {
        counter[k] = 0;
      } else {
        counter[k]!++;
        break;
      }
    }
  }
  return output;
}

export function aesCfbDecrypt(
  key: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Uint8Array {
  const roundKeys = keyExpansion(key);
  const plaintext = new Uint8Array(ciphertext.length);
  let prev = iv;

  for (let i = 0; i < ciphertext.length; i += 16) {
    const enc = aesEncryptBlock(prev, roundKeys);
    const blockSize = Math.min(16, ciphertext.length - i);
    for (let j = 0; j < blockSize; j++)
      plaintext[i + j] = ciphertext[i + j]! ^ enc[j]!;
    prev =
      blockSize === 16
        ? ciphertext.slice(i, i + 16)
        : (() => {
            const b = new Uint8Array(16);
            b.set(ciphertext.slice(i, i + blockSize));
            return b;
          })();
  }
  return plaintext;
}
