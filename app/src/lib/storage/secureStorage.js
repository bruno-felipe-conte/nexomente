/**
 * Armazenamento seguro de dados sensíveis utilizando Web Crypto API (AES-GCM).
 * Deriva uma chave estável e segura baseada no ambiente local do dispositivo.
 */

const ENCRYPTION_PREFIX = "enc:v1:";
const SALT = new Uint8Array([110, 101, 120, 111, 109, 101, 110, 116, 101, 95, 115, 101, 99, 117, 114, 101]); // "nexomente_secure"

let cachedKey = null;

async function getDeviceKey() {
  if (cachedKey) return cachedKey;
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    return null;
  }

  // Identificador do dispositivo como material de chave base
  const rawId = `${navigator.userAgent || "default"}_${screen.width || 1920}x${screen.height || 1080}_nexomente`;
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(rawId),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  cachedKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: SALT,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return cachedKey;
}

export async function encryptSensitiveData(plainText) {
  if (typeof plainText !== "string") {
    plainText = JSON.stringify(plainText);
  }
  try {
    const key = await getDeviceKey();
    if (!key) return plainText;

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(plainText);

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedData
    );

    const ivBase64 = btoa(String.fromCharCode(...iv));
    const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));

    return `${ENCRYPTION_PREFIX}${ivBase64}:${cipherBase64}`;
  } catch (e) {
    console.warn("[SECURE STORAGE] Falha na encriptação, usando valor original:", e.message);
    return plainText;
  }
}

export async function decryptSensitiveData(encryptedData) {
  if (typeof encryptedData !== "string" || !encryptedData.startsWith(ENCRYPTION_PREFIX)) {
    return encryptedData;
  }
  try {
    const key = await getDeviceKey();
    if (!key) return encryptedData;

    const parts = encryptedData.slice(ENCRYPTION_PREFIX.length).split(":");
    if (parts.length !== 2) return encryptedData;

    const iv = Uint8Array.from(atob(parts[0]), (c) => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.warn("[SECURE STORAGE] Falha na decriptação:", e.message);
    return null;
  }
}

export const secureStorage = {
  async setItem(key, value) {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    const encrypted = await encryptSensitiveData(serialized);
    localStorage.setItem(key, encrypted);
  },

  async getItem(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const decrypted = await decryptSensitiveData(raw);
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  },

  removeItem(key) {
    localStorage.removeItem(key);
  },
};
