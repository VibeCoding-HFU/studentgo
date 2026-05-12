import {
  base64ToBytes,
  bytesToBase64,
  CompatibleSubtle,
  encryptedKeysFromValue,
  EncryptedEnvelope,
  parsePrivateKey,
  rsaAlgorithm,
} from './client-crypto.shared';
export { getPrivateKey, getPrivateKeys, hasPrivateKey, publicKeyFromPrivateKey, publicKeyJsonsFromValue, publicKeyValueIncludes, savePrivateKey } from './client-crypto.shared';

function getSubtle(): CompatibleSubtle {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Dieses Web-Frontend unterstuetzt WebCrypto nicht.');
  }

  return globalThis.crypto.subtle as unknown as CompatibleSubtle;
}

function getRandomBytes(length: number) {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Dieses Web-Frontend unterstuetzt sichere Zufallszahlen nicht.');
  }

  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

export async function generateAccountKeyPair() {
  const subtle = getSubtle();
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
  const subtle = getSubtle();
  const publicKeys = await Promise.all(publicKeyJsons.map((publicKeyJson) => subtle.importKey(
    'jwk',
    JSON.parse(publicKeyJson),
    rsaAlgorithm,
    false,
    ['encrypt'],
  )));
  const aesKey = await subtle.generateKey({ length: 256, name: 'AES-GCM' }, true, ['encrypt']);
  const iv = getRandomBytes(12);
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
  const subtle = getSubtle();
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
