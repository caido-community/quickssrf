export const generateRandomString = (
  length: number,
  lettersOnly: boolean = false
) => {
  let characters = "";
  if (lettersOnly) {
    characters = "abcdefghijklmnopqrstuvwxyz";
  } else {
    characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  }
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
