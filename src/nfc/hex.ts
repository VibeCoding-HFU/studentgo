export function bytesToHex(bytes: ArrayLike<number> | null | undefined, separator = ' '): string {
  if (!bytes) {
    return '';
  }

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
    .join(separator);
}

export function bytesToCompactHex(bytes: ArrayLike<number> | null | undefined): string {
  return bytesToHex(bytes, '');
}

export function compactHexToBytes(hex: string): number[] {
  const clean = hex.replace(/[^a-fA-F0-9]/g, '');
  const bytes: number[] = [];

  for (let index = 0; index + 1 < clean.length; index += 2) {
    bytes.push(Number.parseInt(clean.slice(index, index + 2), 16));
  }

  return bytes;
}

export function le24(bytes: number[], offset = 0): number | undefined {
  if (bytes.length < offset + 3) {
    return undefined;
  }

  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

export function signedLe32(bytes: number[], offset = 0): number | undefined {
  if (bytes.length < offset + 4) {
    return undefined;
  }

  const value = (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >> 0;
  return value;
}

export function unsignedLe32(bytes: number[], offset = 0): number | undefined {
  if (bytes.length < offset + 4) {
    return undefined;
  }

  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

export function bcdToNumber(bytes: number[]): number | undefined {
  let digits = '';

  for (const byte of bytes) {
    const high = (byte >> 4) & 0x0F;
    const low = byte & 0x0F;

    if (high > 9 || low > 9) {
      return undefined;
    }

    digits += `${high}${low}`;
  }

  const normalized = digits.replace(/^0+/, '') || '0';
  return Number.parseInt(normalized, 10);
}

export function formatEuroCents(amountCents: number): string {
  return new Intl.NumberFormat('de-DE', {
    currency: 'EUR',
    style: 'currency',
  }).format(amountCents / 100);
}
