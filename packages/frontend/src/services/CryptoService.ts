import * as CryptoJS from 'crypto-js';

export class CryptoService {
    private privKey: CryptoKey | null = null;
    private pubKey: CryptoKey | null = null;
    private keyInitializationPromise: Promise<void>;

    constructor() {
        this.keyInitializationPromise = this.initializeRSAKeys();
    }

    // Initialize RSA keys
    private async initializeRSAKeys(): Promise<void> {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: { name: 'SHA-256' },
            },
            true, // Extractable keys
            ['encrypt', 'decrypt']
        );
        this.pubKey = keyPair.publicKey;
        this.privKey = keyPair.privateKey;
    }

    // Get the private key
    public getPrivateKey(): CryptoKey | null {
        return this.privKey;
    }


    public getPublicKey(): CryptoKey | null {
        return this.pubKey;
    }

    public async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // Export public key as a Base64-encoded string
    public async encodePublicKey(): Promise<string> {
        await this.keyInitializationPromise;
        const exported = await window.crypto.subtle.exportKey('spki', this.pubKey as CryptoKey);
        const base64Key = this.arrayBufferToBase64(exported);
        return btoa(`-----BEGIN PUBLIC KEY-----\n${base64Key.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`);
    }

    // Decrypt RSA-encrypted data
    public async decryptRSA(encodedKey: string): Promise<ArrayBuffer> {
        if (!this.privKey) throw new Error('Private key not initialized');
        const encryptedData = this.base64ToArrayBuffer(encodedKey);
        return await window.crypto.subtle.decrypt(
            {
                name: 'RSA-OAEP',
            },
            this.privKey,
            encryptedData
        );
    }

    public async decryptMessage(key: string, secureMessage: string): Promise<string> {
        if (!this.privKey) throw new Error('Private key is not initialized');

        // Decode the base64-encoded symmetric key
        const decodedKey = this.base64ToArrayBuffer(key);

        // Decrypt the symmetric key using the private RSA key
        const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
            {
                name: 'RSA-OAEP',
            },
            this.privKey,
            decodedKey
        );

        // Convert decrypted key to WordArray
        const decryptedKey = CryptoJS.lib.WordArray.create(new Uint8Array(decryptedKeyBuffer));
        // Decode base64 secure message
        const secureMessageWords = CryptoJS.enc.Base64.parse(secureMessage);
        // Extract IV and ciphertext
        const ivWords = CryptoJS.lib.WordArray.create(secureMessageWords.words.slice(0, 4), 16);

        const ciphertextWords = CryptoJS.lib.WordArray.create(
            secureMessageWords.words.slice(4),
            secureMessageWords.sigBytes - 16
        );

        const cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: ciphertextWords,
        });

        // Decrypt using AES-256-CFB
        const decrypted = CryptoJS.AES.decrypt(
            cipherParams,
            decryptedKey,
            {
                iv: ivWords,
                mode: CryptoJS.mode.CFB,
                padding: CryptoJS.pad.NoPadding,
            }
        );

        // Convert decrypted data to string
        const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

        return plaintext;
    }


    // Decrypt AES-encrypted data
    public async decryptAES(
        key: ArrayBuffer,
        iv: ArrayBuffer,
        encryptedData: ArrayBuffer
    ): Promise<ArrayBuffer> {
        const aesKey = await window.crypto.subtle.importKey(
            'raw',
            key,
            { name: 'AES-CFB' },
            false,
            ['decrypt']
        );

        return await window.crypto.subtle.decrypt(
            {
                name: 'AES-CFB',
                iv,
            },
            aesKey,
            encryptedData
        );
    }

    // Convert ArrayBuffer to Base64
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const binary = String.fromCharCode(...new Uint8Array(buffer));
        return btoa(binary);
    }

    // Convert Base64 to ArrayBuffer
    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

export const cryptoService = new CryptoService();

