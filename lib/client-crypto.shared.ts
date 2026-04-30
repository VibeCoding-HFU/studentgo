export type EncryptedEnvelope = {
  encryptedKey: string;
  encryptedPayload: string;
  encryptionIv: string;
};

export type RsaPrivateJwk = JsonWebKey & {
  d: string;
  e: string;
  kty: 'RSA';
  n: string;
};

export type CompatibleSubtle = {
  decrypt(algorithm: unknown, key: unknown, data: unknown): Promise<ArrayBuffer>;
  encrypt(algorithm: unknown, key: unknown, data: unknown): Promise<ArrayBuffer>;
  exportKey(format: 'jwk', key: unknown): Promise<JsonWebKey>;
  exportKey(format: 'raw', key: unknown): Promise<ArrayBuffer>;
  generateKey(
    algorithm: unknown,
    extractable: boolean,
    keyUsages: string[],
  ): Promise<{ privateKey: unknown; publicKey: unknown }>;
  importKey(
    format: 'jwk' | 'raw',
    keyData: unknown,
    algorithm: unknown,
    extractable: boolean,
    keyUsages: string[],
  ): Promise<unknown>;
};

export const rsaAlgorithm = {
  hash: 'SHA-256',
  name: 'RSA-OAEP',
} as const;

export function storageKey(email: string) {
  return `studentgo-private-key:${email.trim().toLowerCase()}`;
}

const privateKeyMemoryStore = new Map<string, string>();

export function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export function parsePrivateKey(privateKeyJson: string): RsaPrivateJwk {
  const parsed = JSON.parse(privateKeyJson) as Partial<RsaPrivateJwk>;

  if (parsed.kty !== 'RSA' || !parsed.d || !parsed.n || !parsed.e) {
    throw new Error('Unsupported private key.');
  }

  return parsed as RsaPrivateJwk;
}

export function publicKeyFromPrivateKey(privateKeyJson: string) {
  const parsed = parsePrivateKey(privateKeyJson);
  return JSON.stringify({
    alg: parsed.alg,
    e: parsed.e,
    ext: true,
    key_ops: ['encrypt'],
    kty: parsed.kty,
    n: parsed.n,
  });
}

export function savePrivateKey(email: string, privateKeyJson: string) {
  parsePrivateKey(privateKeyJson);
  const key = storageKey(email);
  privateKeyMemoryStore.set(key, privateKeyJson);
  try {
    globalThis.localStorage?.setItem(key, privateKeyJson);
  } catch {
    // Native builds may not provide localStorage; the in-memory store keeps the active frontend usable.
  }
}

export function getPrivateKey(email: string) {
  const key = storageKey(email);
  try {
    return globalThis.localStorage?.getItem(key) ?? privateKeyMemoryStore.get(key) ?? null;
  } catch {
    return privateKeyMemoryStore.get(key) ?? null;
  }
}

export function hasPrivateKey(email?: string | null) {
  return Boolean(email && getPrivateKey(email));
}
