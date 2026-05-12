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

const privateKeyMemoryStore = new Map<string, string[]>();

function privateKeyStorage() {
  return globalThis.sessionStorage;
}

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

export function privateKeyJsonsFromValue(value?: string | null) {
  if (!value?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return [...new Set(parsed.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())))];
    }
  } catch {
    // Older storage entries contain a single private JWK string.
  }

  return [value];
}

export function addPrivateKeyToValue(value: string | null | undefined, privateKeyJson: string) {
  parsePrivateKey(privateKeyJson);
  const keys = privateKeyJsonsFromValue(value);

  if (!keys.includes(privateKeyJson)) {
    keys.push(privateKeyJson);
  }

  return JSON.stringify(keys);
}

export function publicKeyJsonsFromValue(value?: string | null) {
  if (!value?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return [...new Set(parsed.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())))];
    }
  } catch {
    // A single public JWK is also stored as JSON, so parse failures just mean "not a key list".
  }

  return [value];
}

export function addPublicKeyToValue(value: string | null | undefined, publicKeyJson: string) {
  const keys = publicKeyJsonsFromValue(value);

  if (!keys.includes(publicKeyJson)) {
    keys.push(publicKeyJson);
  }

  return JSON.stringify(keys);
}

export function publicKeyValueIncludes(value: string | null | undefined, publicKeyJson: string) {
  return publicKeyJsonsFromValue(value).includes(publicKeyJson);
}

export function encryptedKeysFromValue(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
    }
  } catch {
    // Existing records store the single encrypted key directly as base64.
  }

  return [value];
}

export function rememberPrivateKey(email: string, privateKeyJson: string) {
  parsePrivateKey(privateKeyJson);
  const key = storageKey(email);
  const keys = privateKeyMemoryStore.get(key) ?? [];

  if (!keys.includes(privateKeyJson)) {
    privateKeyMemoryStore.set(key, [...keys, privateKeyJson]);
  }
}

export function getRememberedPrivateKey(email: string) {
  const keys = getRememberedPrivateKeys(email);
  return keys.at(-1) ?? null;
}

export function getRememberedPrivateKeys(email: string) {
  return privateKeyMemoryStore.get(storageKey(email)) ?? [];
}

export async function savePrivateKey(email: string, privateKeyJson: string) {
  const key = storageKey(email);
  let storedValue: string | null = null;

  try {
    storedValue = privateKeyStorage()?.getItem(key) ?? globalThis.localStorage?.getItem(key) ?? null;
    privateKeyStorage()?.setItem(key, addPrivateKeyToValue(storedValue, privateKeyJson));
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Native builds may not provide browser storage; the in-memory store keeps the active frontend usable.
  }

  rememberPrivateKey(email, privateKeyJson);
}

export async function getPrivateKey(email: string) {
  const keys = await getPrivateKeys(email);
  return keys.at(-1) ?? null;
}

export async function getPrivateKeys(email: string) {
  const key = storageKey(email);

  try {
    const storedValue = privateKeyStorage()?.getItem(key) ?? globalThis.localStorage?.getItem(key) ?? null;
    const storedKeys = privateKeyJsonsFromValue(storedValue);

    if (storedKeys.length > 0) {
      storedKeys.forEach((privateKeyJson) => rememberPrivateKey(email, privateKeyJson));
      privateKeyStorage()?.setItem(key, JSON.stringify(storedKeys));
      globalThis.localStorage?.removeItem(key);
      return storedKeys;
    }

    return getRememberedPrivateKeys(email);
  } catch {
    return getRememberedPrivateKeys(email);
  }
}

export async function hasPrivateKey(email?: string | null) {
  return Boolean(email && await getPrivateKey(email));
}
