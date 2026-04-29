type EncryptedEnvelope = {
  encryptedKey: string;
  encryptedPayload: string;
  encryptionIv: string;
};

function storageKey(email: string) {
  return `studentgo-private-key:${email.trim().toLowerCase()}`;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function ensureCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Dieses Frontend unterstuetzt die lokale Verschluesselung nicht.');
  }

  return globalThis.crypto;
}

export async function generateAccountKeyPair() {
  const crypto = ensureCrypto();
  const keyPair = await crypto.subtle.generateKey(
    {
      hash: 'SHA-256',
      modulusLength: 2048,
      name: 'RSA-OAEP',
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ['encrypt', 'decrypt'],
  );

  return {
    privateKeyJson: JSON.stringify(await crypto.subtle.exportKey('jwk', keyPair.privateKey)),
    publicKeyJson: JSON.stringify(await crypto.subtle.exportKey('jwk', keyPair.publicKey)),
  };
}

export function savePrivateKey(email: string, privateKeyJson: string) {
  globalThis.localStorage?.setItem(storageKey(email), privateKeyJson);
}

export function getPrivateKey(email: string) {
  return globalThis.localStorage?.getItem(storageKey(email)) ?? null;
}

export function hasPrivateKey(email?: string | null) {
  return Boolean(email && getPrivateKey(email));
}

export async function encryptPayload(publicKeyJson: string, payload: Record<string, unknown>): Promise<EncryptedEnvelope> {
  const crypto = ensureCrypto();
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(publicKeyJson),
    { hash: 'SHA-256', name: 'RSA-OAEP' },
    false,
    ['encrypt'],
  );
  const aesKey = await crypto.subtle.generateKey({ length: 256, name: 'AES-GCM' }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));
  const encryptedPayload = new Uint8Array(await crypto.subtle.encrypt({ iv, name: 'AES-GCM' }, aesKey, encodedPayload));
  const rawAesKey = new Uint8Array(await crypto.subtle.exportKey('raw', aesKey));
  const encryptedKey = new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAesKey));

  return {
    encryptedKey: bytesToBase64(encryptedKey),
    encryptedPayload: bytesToBase64(encryptedPayload),
    encryptionIv: bytesToBase64(iv),
  };
}

export async function decryptPayload<T>(privateKeyJson: string, envelope: EncryptedEnvelope): Promise<T> {
  const crypto = ensureCrypto();
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(privateKeyJson),
    { hash: 'SHA-256', name: 'RSA-OAEP' },
    false,
    ['decrypt'],
  );
  const rawAesKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, base64ToBytes(envelope.encryptedKey));
  const aesKey = await crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt(
    { iv: base64ToBytes(envelope.encryptionIv), name: 'AES-GCM' },
    aesKey,
    base64ToBytes(envelope.encryptedPayload),
  );

  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}
