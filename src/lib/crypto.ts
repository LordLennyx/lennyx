// ── Chiffrement local (Web Crypto) : export protégé + sauvegarde cloud ────
// AES-GCM 256 bits, clé dérivée d'un mot de passe via PBKDF2 (210 000 itérations).
// Rien de tout cela ne transite jamais en clair : ni sur disque, ni vers le cloud.

export interface EncryptedPayload {
  v: 1;
  salt: string; // base64
  iv: string; // base64
  data: string; // base64 (texte chiffré)
}

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 210000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptText(plain: string, passphrase: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, new TextEncoder().encode(plain));
  return { v: 1, salt: toB64(salt), iv: toB64(iv), data: toB64(cipher) };
}

/** Lève une erreur si le mot de passe est incorrect (l'authentification AES-GCM échoue). */
export async function decryptText(payload: EncryptedPayload, passphrase: string): Promise<string> {
  const salt = fromB64(payload.salt);
  const iv = fromB64(payload.iv);
  const key = await deriveKey(passphrase, salt);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, fromB64(payload.data) as BufferSource);
  return new TextDecoder().decode(plainBuf);
}

export function isEncryptedPayload(obj: unknown): obj is EncryptedPayload {
  const o = obj as Record<string, unknown>;
  return !!o && o.v === 1 && typeof o.salt === 'string' && typeof o.iv === 'string' && typeof o.data === 'string';
}
