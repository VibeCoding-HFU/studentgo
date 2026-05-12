import { bytesToHex, compactHexToBytes, formatEuroCents, le24, signedLe32, unsignedLe32, bcdToNumber } from './hex';
import type { BalanceCandidate, DesfireFile, DesfireFileSettings, DesfireFileType } from './types';

const MAX_PLAUSIBLE_BALANCE_CENTS = 25000;

function fileTypeFromCode(code: number | undefined): DesfireFileType {
  switch (code) {
    case 0x00:
      return 'standard-data';
    case 0x01:
      return 'backup-data';
    case 0x02:
      return 'value';
    case 0x03:
      return 'linear-record';
    case 0x04:
      return 'cyclic-record';
    default:
      return 'unknown';
  }
}

function readSigned(bytes: number[], offset: number): number | undefined {
  return signedLe32(bytes, offset);
}

export function parseFileSettings(fileId: number, data: number[]): DesfireFileSettings {
  const fileTypeCode = data[0];
  const communicationMode = data[1];
  const accessByte0 = data[2];
  const accessByte1 = data[3];
  const fileType = fileTypeFromCode(fileTypeCode);
  const readKey = accessByte1 === undefined ? null : (accessByte1 >> 4) & 0x0F;
  const writeKey = accessByte1 === undefined ? null : accessByte1 & 0x0F;
  const readWriteKey = accessByte0 === undefined ? null : (accessByte0 >> 4) & 0x0F;
  const changeKey = accessByte0 === undefined ? null : accessByte0 & 0x0F;
  const settings: DesfireFileSettings = {
    accessRights: accessByte0 === undefined || accessByte1 === undefined
      ? null
      : {
          changeKey,
          isReadFree: readKey === 0x0E || readWriteKey === 0x0E,
          rawHex: bytesToHex([accessByte0, accessByte1]),
          readKey,
          readWriteKey,
          writeKey,
        },
    communicationMode: communicationMode ?? null,
    fileId,
    fileType,
    fileTypeCode: fileTypeCode ?? null,
    rawHex: bytesToHex(data),
  };

  if ((fileType === 'standard-data' || fileType === 'backup-data') && data.length >= 7) {
    settings.fileSize = le24(data, 4);
  }

  if (fileType === 'value' && data.length >= 17) {
    settings.lowerLimit = readSigned(data, 4);
    settings.upperLimit = readSigned(data, 8);
    settings.limitedCreditValue = readSigned(data, 12);
    settings.limitedCreditEnabled = data[16] === 1;
  }

  if ((fileType === 'linear-record' || fileType === 'cyclic-record') && data.length >= 13) {
    settings.recordSize = le24(data, 4);
    settings.maxRecords = le24(data, 7);
    settings.currentRecords = le24(data, 10);
  }

  return settings;
}

function addCandidate(candidates: BalanceCandidate[], value: number | undefined, source: string, parser: string, rawHex: string, confidence: number) {
  if (value === undefined || !Number.isFinite(value)) {
    return;
  }

  if (value < 0 || value > MAX_PLAUSIBLE_BALANCE_CENTS) {
    return;
  }

  candidates.push({
    amountCents: value,
    amountEuro: value / 100,
    confidence,
    formatted: formatEuroCents(value),
    parser,
    rawHex,
    source,
  });
}

function candidatesFromBytes(bytes: number[], source: string, baseConfidence: number): BalanceCandidate[] {
  const candidates: BalanceCandidate[] = [];

  for (let offset = 0; offset + 4 <= bytes.length; offset += 1) {
    const chunk = bytes.slice(offset, offset + 4);
    const chunkHex = bytesToHex(chunk);
    addCandidate(candidates, signedLe32(bytes, offset), source, `LE32 signed @${offset}`, chunkHex, baseConfidence);
    addCandidate(candidates, unsignedLe32(bytes, offset), source, `LE32 unsigned @${offset}`, chunkHex, baseConfidence - 5);
  }

  for (let offset = 0; offset + 2 <= bytes.length; offset += 1) {
    const value = bytes[offset] | (bytes[offset + 1] << 8);
    addCandidate(candidates, value, source, `LE16 unsigned @${offset}`, bytesToHex(bytes.slice(offset, offset + 2)), baseConfidence - 20);
  }

  for (let length = 2; length <= Math.min(6, bytes.length); length += 1) {
    for (let offset = 0; offset + length <= bytes.length; offset += 1) {
      const chunk = bytes.slice(offset, offset + length);
      addCandidate(candidates, bcdToNumber(chunk), source, `BCD @${offset}/${length}`, bytesToHex(chunk), baseConfidence - 10);
    }
  }

  return candidates;
}

export function findBalanceCandidates(files: DesfireFile[]): BalanceCandidate[] {
  const candidates = files.flatMap((file) => {
    const source = `File ${file.id}`;
    const bytes = file.rawDataHex ? compactHexToBytes(file.rawDataHex) : [];

    if (file.settings?.fileType === 'value') {
      const valueCandidates = candidatesFromBytes(bytes, source, 95);
      return valueCandidates.map((candidate) => ({
        ...candidate,
        confidence: candidate.parser.includes('LE32 signed') ? 100 : candidate.confidence,
      }));
    }

    return candidatesFromBytes(bytes, source, 65);
  });

  const unique = new Map<string, BalanceCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.amountCents}:${candidate.source}:${candidate.rawHex}`;
    const existing = unique.get(key);

    if (!existing || candidate.confidence > existing.confidence) {
      unique.set(key, candidate);
    }
  }

  return Array.from(unique.values()).sort((left, right) => {
    if (right.confidence !== left.confidence) {
      return right.confidence - left.confidence;
    }

    return left.amountCents - right.amountCents;
  });
}
