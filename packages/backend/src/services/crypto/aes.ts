/**
 * Pure JavaScript AES-256-CFB implementation for Caido backend
 * Based on the AES specification (FIPS-197)
 */

// AES S-box
const SBOX: number[] = [
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe,
  0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4,
  0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7,
  0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3,
  0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75, 0x09,
  0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3,
  0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe,
  0x39, 0x4a, 0x4c, 0x58, 0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85,
  0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92,
  0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c,
  0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19,
  0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14,
  0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2,
  0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5,
  0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 0xba, 0x78, 0x25,
  0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86,
  0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e,
  0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42,
  0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
];

// Round constants
const RCON: number[] = [
  0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36,
];

/**
 * Galois Field multiplication
 */
function gmul(a: number, b: number): number {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) {
      p ^= a;
    }
    const hiBitSet = a & 0x80;
    a = (a << 1) & 0xff;
    if (hiBitSet) {
      a ^= 0x1b;
    }
    b >>= 1;
  }
  return p;
}

/**
 * SubBytes transformation
 */
function subBytes(state: number[][]): void {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      state[i]![j] = SBOX[state[i]![j]!]!;
    }
  }
}

/**
 * ShiftRows transformation
 */
function shiftRows(state: number[][]): void {
  // Row 1: shift left by 1
  const temp1 = state[1]![0];
  state[1]![0] = state[1]![1]!;
  state[1]![1] = state[1]![2]!;
  state[1]![2] = state[1]![3]!;
  state[1]![3] = temp1!;

  // Row 2: shift left by 2
  const temp2a = state[2]![0];
  const temp2b = state[2]![1];
  state[2]![0] = state[2]![2]!;
  state[2]![1] = state[2]![3]!;
  state[2]![2] = temp2a!;
  state[2]![3] = temp2b!;

  // Row 3: shift left by 3 (= shift right by 1)
  const temp3 = state[3]![3];
  state[3]![3] = state[3]![2]!;
  state[3]![2] = state[3]![1]!;
  state[3]![1] = state[3]![0]!;
  state[3]![0] = temp3!;
}

/**
 * MixColumns transformation
 */
function mixColumns(state: number[][]): void {
  for (let c = 0; c < 4; c++) {
    const a0 = state[0]![c]!;
    const a1 = state[1]![c]!;
    const a2 = state[2]![c]!;
    const a3 = state[3]![c]!;

    state[0]![c] = gmul(a0, 2) ^ gmul(a1, 3) ^ a2 ^ a3;
    state[1]![c] = a0 ^ gmul(a1, 2) ^ gmul(a2, 3) ^ a3;
    state[2]![c] = a0 ^ a1 ^ gmul(a2, 2) ^ gmul(a3, 3);
    state[3]![c] = gmul(a0, 3) ^ a1 ^ a2 ^ gmul(a3, 2);
  }
}

/**
 * AddRoundKey transformation
 */
function addRoundKey(state: number[][], roundKey: number[][]): void {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const stateRow = state[i];
      const roundKeyRow = roundKey[i];
      if (stateRow && roundKeyRow) {
        stateRow[j] = (stateRow[j] ?? 0) ^ (roundKeyRow[j] ?? 0);
      }
    }
  }
}

/**
 * Key expansion for AES-256 (14 rounds)
 */
function keyExpansion(key: Uint8Array): number[][][] {
  const Nk = 8; // AES-256: 8 words
  const Nr = 14; // AES-256: 14 rounds
  const Nb = 4;

  const w: number[][] = [];

  // Copy the key into the first Nk words
  for (let i = 0; i < Nk; i++) {
    w[i] = [key[4 * i]!, key[4 * i + 1]!, key[4 * i + 2]!, key[4 * i + 3]!];
  }

  // Generate the remaining words
  for (let i = Nk; i < Nb * (Nr + 1); i++) {
    const temp = [...w[i - 1]!];

    if (i % Nk === 0) {
      // RotWord
      const t = temp[0]!;
      temp[0] = temp[1]!;
      temp[1] = temp[2]!;
      temp[2] = temp[3]!;
      temp[3] = t;

      // SubWord
      for (let j = 0; j < 4; j++) {
        temp[j] = SBOX[temp[j]!]!;
      }

      // XOR with Rcon
      temp[0] ^= RCON[i / Nk - 1]!;
    } else if (Nk > 6 && i % Nk === 4) {
      // SubWord for AES-256
      for (let j = 0; j < 4; j++) {
        temp[j] = SBOX[temp[j]!]!;
      }
    }

    w[i] = [];
    for (let j = 0; j < 4; j++) {
      w[i]![j] = w[i - Nk]![j]! ^ temp[j]!;
    }
  }

  // Convert to round keys (4x4 matrices)
  const roundKeys: number[][][] = [];
  for (let round = 0; round <= Nr; round++) {
    const roundKey: number[][] = [[], [], [], []];
    for (let col = 0; col < 4; col++) {
      const word = w[round * 4 + col]!;
      for (let row = 0; row < 4; row++) {
        roundKey[row]![col] = word[row]!;
      }
    }
    roundKeys.push(roundKey);
  }

  return roundKeys;
}

/**
 * AES block encryption (single 16-byte block)
 */
function aesEncryptBlock(
  block: Uint8Array,
  roundKeys: number[][][],
): Uint8Array {
  const Nr = 14; // AES-256

  // Initialize state from block (column-major order)
  const state: number[][] = [[], [], [], []];
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      state[row]![col] = block[col * 4 + row]!;
    }
  }

  // Initial round key addition
  addRoundKey(state, roundKeys[0]!);

  // Main rounds
  for (let round = 1; round < Nr; round++) {
    subBytes(state);
    shiftRows(state);
    mixColumns(state);
    addRoundKey(state, roundKeys[round]!);
  }

  // Final round (no MixColumns)
  subBytes(state);
  shiftRows(state);
  addRoundKey(state, roundKeys[Nr]!);

  // Convert state back to output block (column-major order)
  const output = new Uint8Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      output[col * 4 + row] = state[row]![col]!;
    }
  }

  return output;
}

/**
 * AES-256-CFB decryption
 * CFB mode: plaintext = ciphertext XOR AES(previousCiphertext)
 */
export function aesCfbDecrypt(
  key: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Uint8Array {
  if (key.length !== 32) {
    throw new Error("AES-256 requires a 32-byte key");
  }
  if (iv.length !== 16) {
    throw new Error("AES requires a 16-byte IV");
  }

  const roundKeys = keyExpansion(key);
  const plaintext = new Uint8Array(ciphertext.length);

  let previousBlock = iv;

  for (let i = 0; i < ciphertext.length; i += 16) {
    // Encrypt the previous ciphertext block (or IV for first block)
    const encryptedBlock = aesEncryptBlock(previousBlock, roundKeys);

    // XOR with current ciphertext to get plaintext
    const blockSize = Math.min(16, ciphertext.length - i);
    for (let j = 0; j < blockSize; j++) {
      plaintext[i + j] = ciphertext[i + j]! ^ encryptedBlock[j]!;
    }

    // The previous block for CFB is the ciphertext block (not the plaintext)
    if (blockSize === 16) {
      previousBlock = ciphertext.slice(i, i + 16);
    } else {
      // Last partial block
      const newPrevBlock = new Uint8Array(16);
      newPrevBlock.set(ciphertext.slice(i, i + blockSize));
      previousBlock = newPrevBlock;
    }
  }

  return plaintext;
}

/**
 * AES-256-CFB encryption (for testing/completeness)
 */
export function aesCfbEncrypt(
  key: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
): Uint8Array {
  if (key.length !== 32) {
    throw new Error("AES-256 requires a 32-byte key");
  }
  if (iv.length !== 16) {
    throw new Error("AES requires a 16-byte IV");
  }

  const roundKeys = keyExpansion(key);
  const ciphertext = new Uint8Array(plaintext.length);

  let previousBlock = iv;

  for (let i = 0; i < plaintext.length; i += 16) {
    // Encrypt the previous ciphertext block (or IV for first block)
    const encryptedBlock = aesEncryptBlock(previousBlock, roundKeys);

    // XOR with current plaintext to get ciphertext
    const blockSize = Math.min(16, plaintext.length - i);
    for (let j = 0; j < blockSize; j++) {
      ciphertext[i + j] = plaintext[i + j]! ^ encryptedBlock[j]!;
    }

    // The previous block for CFB is the ciphertext block
    if (blockSize === 16) {
      previousBlock = ciphertext.slice(i, i + 16);
    } else {
      const newPrevBlock = new Uint8Array(16);
      newPrevBlock.set(ciphertext.slice(i, i + blockSize));
      previousBlock = newPrevBlock;
    }
  }

  return ciphertext;
}
