import 'react-native-get-random-values';

import {
  base64ToBytes,
  bytesToBase64,
  CompatibleSubtle,
  EncryptedEnvelope,
  parsePrivateKey,
  rsaAlgorithm,
} from './client-crypto.shared';
export { getPrivateKey, hasPrivateKey, publicKeyFromPrivateKey, savePrivateKey } from './client-crypto.shared';

type QuickCryptoModule = typeof import('react-native-quick-crypto').default;

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
  const subtle = await getSubtle();
  const publicKey = await subtle.importKey(
    'jwk',
    JSON.parse(publicKeyJson),
    rsaAlgorithm,
    false,
    ['encrypt'],
  );
  const aesKey = await subtle.generateKey({ length: 256, name: 'AES-GCM' }, true, ['encrypt']);
  const iv = await getRandomBytes(12);
  const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));
  const encryptedPayload = new Uint8Array(await subtle.encrypt({ iv, name: 'AES-GCM' }, aesKey, encodedPayload));
  const rawAesKey = new Uint8Array(await subtle.exportKey('raw', aesKey));
  const encryptedKey = new Uint8Array(await subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAesKey));

  return {
    encryptedKey: bytesToBase64(encryptedKey),
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
  const rawAesKey = await subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, base64ToBytes(envelope.encryptedKey));
  const aesKey = await subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt']);
  const decrypted = await subtle.decrypt(
    { iv: base64ToBytes(envelope.encryptionIv), name: 'AES-GCM' },
    aesKey,
    base64ToBytes(envelope.encryptedPayload),
  );

  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}
