import 'react-native-get-random-values';

import * as SecureStore from 'expo-secure-store';

import {
  addPrivateKeyToValue,
  base64ToBytes,
  bytesToBase64,
  CompatibleSubtle,
  encryptedKeysFromValue,
  EncryptedEnvelope,
  getRememberedPrivateKey,
  getRememberedPrivateKeys,
  rememberPrivateKey,
  parsePrivateKey,
  privateKeyJsonsFromValue,
  rsaAlgorithm,
  storageKey,
} from './client-crypto.shared';
export { publicKeyFromPrivateKey, publicKeyJsonsFromValue, publicKeyValueIncludes } from './client-crypto.shared';

type QuickCryptoModule = typeof import('react-native-quick-crypto').default;
const secureStoreChunkSize = 1800;

function secureStoreKey(email: string) {
  const rawKey = storageKey(email);
  let encodedKey = '';

  for (let index = 0; index < rawKey.length; index += 1) {
    encodedKey += rawKey.charCodeAt(index).toString(16).padStart(4, '0');
  }

  return `studentgo-private-key.${encodedKey}`;
}

function chunkKey(baseKey: string, index: number) {
  return `${baseKey}.chunk.${index}`;
}

async function deleteStoredPrivateKeyChunks(baseKey: string, startIndex: number, count: number) {
  await Promise.all(
    Array.from({ length: Math.max(0, count - startIndex) }, (_, offset) => SecureStore.deleteItemAsync(chunkKey(baseKey, startIndex + offset))),
  );
}

async function getStoredPrivateKey(baseKey: string) {
  const directValue = await SecureStore.getItemAsync(baseKey);

  if (directValue && !directValue.startsWith('chunked:')) {
    return directValue;
  }

  const count = directValue?.startsWith('chunked:') ? Number(directValue.slice('chunked:'.length)) : 0;

  if (!Number.isInteger(count) || count <= 0) {
    return null;
  }

  const chunks = await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(baseKey, index))));

  if (chunks.some((chunk) => !chunk)) {
    return null;
  }

  return chunks.join('');
}

async function getQuickCrypto(): Promise<QuickCryptoModule> {
  try {
    const module = await import('react-native-quick-crypto');
    return module.default;
  } catch (error) {
    throw new Error(
      'Android-Verschluesselung benoetigt einen neu gebauten Dev-Client mit react-native-quick-crypto/NitroModules.',
      { cause: error },
    );
  }
}

async function getSubtle(): Promise<CompatibleSubtle> {
  const quickCrypto = await getQuickCrypto();
  return quickCrypto.subtle as unknown as CompatibleSubtle;
}

async function getRandomBytes(length: number) {
  const quickCrypto = await getQuickCrypto();
  const bytes = new Uint8Array(length);
  quickCrypto.getRandomValues(bytes);
  return bytes;
}

export async function savePrivateKey(email: string, privateKeyJson: string) {
  const key = secureStoreKey(email);
  const previousValue = await SecureStore.getItemAsync(key);
  const previousChunkCount = previousValue?.startsWith('chunked:') ? Number(previousValue.slice('chunked:'.length)) : 0;
  const storedPrivateKeys = await getStoredPrivateKey(key);
  const nextValue = addPrivateKeyToValue(storedPrivateKeys, privateKeyJson);
  const chunks = nextValue.match(new RegExp(`.{1,${secureStoreChunkSize}}`, 'g')) ?? [];

  await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)));
  await SecureStore.setItemAsync(key, `chunked:${chunks.length}`);
  rememberPrivateKey(email, privateKeyJson);

  if (Number.isInteger(previousChunkCount) && previousChunkCount > chunks.length) {
    await deleteStoredPrivateKeyChunks(key, chunks.length, previousChunkCount);
  }
}

export async function getPrivateKey(email: string) {
  const keys = await getPrivateKeys(email);
  return keys.at(-1) ?? null;
}

export async function getPrivateKeys(email: string) {
  const rememberedKey = getRememberedPrivateKey(email);

  if (rememberedKey) {
    return getRememberedPrivateKeys(email);
  }

  const storedKey = await getStoredPrivateKey(secureStoreKey(email));
  const storedKeys = privateKeyJsonsFromValue(storedKey);

  if (storedKeys.length > 0) {
    storedKeys.forEach((privateKeyJson) => rememberPrivateKey(email, privateKeyJson));
    return storedKeys;
  }

  return [];
}

export async function hasPrivateKey(email?: string | null) {
  return Boolean(email && await getPrivateKey(email));
}

export async function generateAccountKeyPair() {
  const subtle = await getSubtle();
  const keyPair = await subtle.generateKey(
    {
      ...rsaAlgorithm,
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ['encrypt', 'decrypt'],
  );

  return {
    privateKeyJson: JSON.stringify(await subtle.exportKey('jwk', keyPair.privateKey)),
    publicKeyJson: JSON.stringify(await subtle.exportKey('jwk', keyPair.publicKey)),
  };
}

export async function encryptPayload(publicKeyJson: string, payload: Record<string, unknown>): Promise<EncryptedEnvelope> {
  return encryptPayloadForPublicKeys([publicKeyJson], payload);
}

export async function encryptPayloadForPublicKeys(publicKeyJsons: string[], payload: Record<string, unknown>): Promise<EncryptedEnvelope> {
  const subtle = await getSubtle();
  const publicKeys = await Promise.all(publicKeyJsons.map((publicKeyJson) => subtle.importKey(
    'jwk',
    JSON.parse(publicKeyJson),
    rsaAlgorithm,
    false,
    ['encrypt'],
  )));
  const aesKey = await subtle.generateKey({ length: 256, name: 'AES-GCM' }, true, ['encrypt']);
  const iv = await getRandomBytes(12);
  const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));
  const encryptedPayload = new Uint8Array(await subtle.encrypt({ iv, name: 'AES-GCM' }, aesKey, encodedPayload));
  const rawAesKey = new Uint8Array(await subtle.exportKey('raw', aesKey));
  const encryptedKeys = await Promise.all(publicKeys.map(async (publicKey) => {
    const encryptedKey = new Uint8Array(await subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAesKey));
    return bytesToBase64(encryptedKey);
  }));

  return {
    encryptedKey: encryptedKeys.length === 1 ? encryptedKeys[0] : JSON.stringify(encryptedKeys),
    encryptedPayload: bytesToBase64(encryptedPayload),
    encryptionIv: bytesToBase64(iv),
  };
}

export async function decryptPayload<T>(privateKeyJson: string, envelope: EncryptedEnvelope): Promise<T> {
  const subtle = await getSubtle();
  const privateKey = await subtle.importKey(
    'jwk',
    parsePrivateKey(privateKeyJson),
    rsaAlgorithm,
    false,
    ['decrypt'],
  );
  let rawAesKey: ArrayBuffer | null = null;

  for (const encryptedKey of encryptedKeysFromValue(envelope.encryptedKey)) {
    try {
      rawAesKey = await subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, base64ToBytes(encryptedKey));
      break;
    } catch {
      // Multi-key envelopes contain one encrypted AES key per public key; only one matches this private key.
    }
  }

  if (!rawAesKey) {
    throw new Error('Private key does not match this payload.');
  }

  const aesKey = await subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt']);
  const decrypted = await subtle.decrypt(
    { iv: base64ToBytes(envelope.encryptionIv), name: 'AES-GCM' },
    aesKey,
    base64ToBytes(envelope.encryptedPayload),
  );

  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}

export async function decryptPayloadWithPrivateKeys<T>(privateKeyJsons: string[], envelope: EncryptedEnvelope): Promise<T> {
  for (const privateKeyJson of [...privateKeyJsons].reverse()) {
    try {
      return await decryptPayload<T>(privateKeyJson, envelope);
    } catch {
      // The payload may have been encrypted for another stored private key.
    }
  }

  throw new Error('No stored private key matches this payload.');
}
