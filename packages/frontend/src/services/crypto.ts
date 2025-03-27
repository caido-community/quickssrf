import * as CryptoJS from "crypto-js";
import { defineStore } from "pinia";

import { arrayBufferToBase64, base64ToArrayBuffer } from "@/utils/utils";

export const useCryptoService = defineStore("services.crypto", () => {
  let privKey: CryptoKey | undefined = undefined;
  let pubKey: CryptoKey | undefined = undefined;
  const keyInitializationPromise: Promise<void> = initializeRSAKeys();

  async function initializeRSAKeys(): Promise<void> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: { name: "SHA-256" },
      },
      true,
      ["encrypt", "decrypt"],
    );
    pubKey = keyPair.publicKey;
    privKey = keyPair.privateKey;
  }

  function getPrivateKey(): CryptoKey | undefined {
    return privKey;
  }

  function getPublicKey(): CryptoKey | undefined {
    return pubKey;
  }

  async function encodePublicKey(): Promise<string> {
    await keyInitializationPromise;
    const exported = await window.crypto.subtle.exportKey(
      "spki",
      pubKey as CryptoKey,
    );
    const base64Key = arrayBufferToBase64(exported);
    return btoa(
      `-----BEGIN PUBLIC KEY-----\n${base64Key.match(/.{1,64}/g)?.join("\n")}\n-----END PUBLIC KEY-----`,
    );
  }

  async function decryptRSA(encodedKey: string): Promise<ArrayBuffer> {
    if (!privKey) throw new Error("Private key not initialized");

    const encryptedData = base64ToArrayBuffer(encodedKey);
    return await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privKey,
      encryptedData,
    );
  }

  async function decryptMessage(
    key: string,
    secureMessage: string,
  ): Promise<string> {
    if (!privKey) throw new Error("Private key is not initialized");

    const decodedKey = base64ToArrayBuffer(key);
    const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privKey,
      decodedKey,
    );

    const decryptedKey = CryptoJS.lib.WordArray.create(
      new Uint8Array(decryptedKeyBuffer),
    );
    const secureMessageWords = CryptoJS.enc.Base64.parse(secureMessage);

    const ivWords = CryptoJS.lib.WordArray.create(
      secureMessageWords.words.slice(0, 4),
      16,
    );

    const ciphertextWords = CryptoJS.lib.WordArray.create(
      secureMessageWords.words.slice(4),
      secureMessageWords.sigBytes - 16,
    );

    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: ciphertextWords,
    });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, decryptedKey, {
      iv: ivWords,
      mode: CryptoJS.mode.CFB,
      padding: CryptoJS.pad.NoPadding,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  async function decryptAES(
    key: ArrayBuffer,
    iv: ArrayBuffer,
    encryptedData: ArrayBuffer,
  ): Promise<ArrayBuffer> {
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      key,
      { name: "AES-CFB" },
      false,
      ["decrypt"],
    );

    return await window.crypto.subtle.decrypt(
      {
        name: "AES-CFB",
        iv,
      },
      aesKey,
      encryptedData,
    );
  }

  return {
    getPrivateKey,
    getPublicKey,
    encodePublicKey,
    decryptRSA,
    decryptMessage,
    decryptAES,
  };
});
