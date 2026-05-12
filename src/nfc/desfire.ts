import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { Platform } from 'react-native';

import { bytesToCompactHex, bytesToHex } from './hex';
import { findBalanceCandidates, parseFileSettings } from './parser';
import type { BalanceCandidate, DesfireApplication, DesfireCommandLog, DesfireFile, DesfireScanResult, NfcAvailability, NfcTagMetadata } from './types';

const NFC_TAG_METADATA_TIMEOUT_MS = 5000;
const ISO_DEP_TRANSCEIVE_TIMEOUT_MS = 12000;
const MAX_READ_FILE_BYTES = 128;
const MAX_ADDITIONAL_FRAMES = 16;
const TRANSCEIVE_RETRIES = 1;

const APDU = {
  continue: [0x90, 0xAF, 0x00, 0x00, 0x00],
  getApplicationIds: [0x90, 0x6A, 0x00, 0x00, 0x00],
  getFileIds: [0x90, 0x6F, 0x00, 0x00, 0x00],
};

type NativeTag = {
  id?: string;
  techTypes?: string[];
  type?: string;
  [key: string]: unknown;
};

type CommandResult = {
  data: number[];
  status: string;
  statusLabel: string;
  ok: boolean;
};

function statusLabel(status: string): string {
  switch (status) {
    case '9100':
      return 'OK';
    case '91AF':
      return 'Weitere Daten vorhanden';
    case '91AE':
      return 'Authentifizierung fehlgeschlagen';
    case '919D':
      return 'Keine Berechtigung';
    case 'TRANSCEIVE_FAILED':
      return 'NFC-Uebertragung fehlgeschlagen';
    case 'INVALID':
      return 'Ungueltige Antwort';
    default:
      return `Status ${status}`;
  }
}

function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = NFC_TAG_METADATA_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label} hat zu lange gedauert.`)), timeoutMs);
    }),
  ]);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function responseStatus(response: number[]): { data: number[]; status: string; ok: boolean } {
  if (response.length < 2) {
    return { data: response, ok: false, status: 'INVALID' };
  }

  const statusBytes = response.slice(response.length - 2);
  const status = bytesToCompactHex(statusBytes);
  return {
    data: response.slice(0, response.length - 2),
    ok: status === '9100',
    status,
  };
}

function selectApplicationApdu(aid: number[]): number[] {
  return [0x90, 0x5A, 0x00, 0x00, 0x03, aid[0], aid[1], aid[2], 0x00];
}

function getFileSettingsApdu(fileId: number): number[] {
  return [0x90, 0xF5, 0x00, 0x00, 0x01, fileId, 0x00];
}

function readDataApdu(fileId: number, length: number): number[] {
  const safeLength = Math.max(0, Math.min(MAX_READ_FILE_BYTES, length));
  return [0x90, 0xBD, 0x00, 0x00, 0x07, fileId, 0x00, 0x00, 0x00, safeLength & 0xFF, (safeLength >> 8) & 0xFF, (safeLength >> 16) & 0xFF, 0x00];
}

function getValueApdu(fileId: number): number[] {
  return [0x90, 0x6C, 0x00, 0x00, 0x01, fileId, 0x00];
}

function candidateFromTenthsOfCent(amountTenths: number, source: string, parser: string, rawHex: string, confidence: number): BalanceCandidate | null {
  if (!Number.isFinite(amountTenths) || amountTenths < 0) {
    return null;
  }

  const amountCents = Math.round(amountTenths / 10);
  if (amountCents > 25000) {
    return null;
  }

  return {
    amountCents,
    amountEuro: amountCents / 100,
    confidence,
    formatted: new Intl.NumberFormat('de-DE', { currency: 'EUR', style: 'currency' }).format(amountCents / 100),
    parser,
    rawHex,
    source,
  };
}

function signedDesfireValue(data: number[]): number | null {
  if (data.length < 4) {
    return null;
  }

  const value = ((data[3] << 24) | (data[2] << 16) | (data[1] << 8) | data[0]) >> 0;
  return value;
}

async function transceive(commandName: string, apdu: number[], commandLog: DesfireCommandLog[]): Promise<CommandResult> {
  const frames: number[] = [];
  let request = apdu;
  let continued = false;

  for (let frameIndex = 0; frameIndex < MAX_ADDITIONAL_FRAMES; frameIndex += 1) {
    let response: number[] | null = null;
    let caughtError: unknown = null;

    for (let attempt = 0; attempt <= TRANSCEIVE_RETRIES; attempt += 1) {
      try {
        response = await NfcManager.isoDepHandler.transceive(request);
        caughtError = null;
        break;
      } catch (error) {
        caughtError = error;
        if (attempt < TRANSCEIVE_RETRIES) {
          await delay(80);
        }
      }
    }

    if (!response) {
      const message = errorMessage(caughtError);
      commandLog.push({
        command: frameIndex === 0 ? commandName : `${commandName} / Continue`,
        continued: frameIndex > 0 || continued,
        dataHex: bytesToHex(frames),
        errorMessage: message,
        ok: false,
        requestHex: bytesToHex(request),
        responseHex: '',
        status: 'TRANSCEIVE_FAILED',
        statusLabel: `${statusLabel('TRANSCEIVE_FAILED')}: ${message}`,
      });

      return {
        data: frames,
        ok: false,
        status: 'TRANSCEIVE_FAILED',
        statusLabel: `${statusLabel('TRANSCEIVE_FAILED')}: ${message}`,
      };
    }

    const parsed = responseStatus(response);
    frames.push(...parsed.data);

    commandLog.push({
      command: frameIndex === 0 ? commandName : `${commandName} / Continue`,
      continued: frameIndex > 0 || continued,
      dataHex: bytesToHex(parsed.data),
      ok: parsed.ok,
      requestHex: bytesToHex(request),
      responseHex: bytesToHex(response),
      status: parsed.status,
      statusLabel: statusLabel(parsed.status),
    });

    if (parsed.status !== '91AF') {
      return {
        data: frames,
        ok: parsed.ok,
        status: parsed.status,
        statusLabel: statusLabel(parsed.status),
      };
    }

    continued = true;
    request = APDU.continue;
  }

  return {
    data: frames,
    ok: false,
    status: '91AF',
    statusLabel: 'Zu viele Additional Frames',
  };
}

function parseApplicationIds(data: number[]): number[][] {
  const aids: number[][] = [];

  for (let index = 0; index + 2 < data.length; index += 3) {
    aids.push(data.slice(index, index + 3));
  }

  return aids;
}

function normalizeTag(tag: NativeTag | null): NfcTagMetadata {
  if (!tag) {
    return {};
  }

  return {
    id: tag.id,
    raw: tag,
    techTypes: tag.techTypes,
    type: tag.type,
  };
}

function readBlockedReason(file: DesfireFile): string | undefined {
  if (!file.settings) {
    return 'File Settings konnten nicht gelesen werden.';
  }

  if (!file.readFree) {
    return 'Datei ist laut Access Rights nicht frei lesbar.';
  }

  if (file.settings.fileType === 'unknown') {
    return 'Unbekannter Dateityp.';
  }

  return undefined;
}

async function scanApplication(aid: number[], commandLog: DesfireCommandLog[]): Promise<DesfireApplication> {
  const aidHex = bytesToHex(aid);
  const selectResult = await transceive(`SelectApplication ${aidHex}`, selectApplicationApdu(aid), commandLog);

  if (!selectResult.ok) {
    return {
      aid: aidHex,
      fileIds: [],
      files: [],
      status: selectResult.status,
      statusLabel: selectResult.statusLabel,
    };
  }

  const fileIdsResult = await transceive(`GetFileIDs ${aidHex}`, APDU.getFileIds, commandLog);
  const fileIds = fileIdsResult.ok ? fileIdsResult.data : [];
  const files: DesfireFile[] = [];

  for (const fileId of fileIds) {
    const settingsResult = await transceive(`GetFileSettings ${aidHex}/${fileId}`, getFileSettingsApdu(fileId), commandLog);
    const settings = settingsResult.ok ? parseFileSettings(fileId, settingsResult.data) : null;
    const readFree = Boolean(settings?.accessRights?.isReadFree);
    const file: DesfireFile = {
      id: fileId,
      readAttempted: false,
      readFree,
      settings,
      status: settingsResult.status,
      statusLabel: settingsResult.statusLabel,
    };

    const blockedReason = readBlockedReason(file);
    if (blockedReason) {
      file.readBlockedReason = blockedReason;
      files.push(file);
      continue;
    }

    if (settings?.fileType === 'standard-data' || settings?.fileType === 'backup-data') {
      const readLength = Math.min(settings.fileSize ?? MAX_READ_FILE_BYTES, MAX_READ_FILE_BYTES);
      file.readAttempted = true;
      const readResult = await transceive(`ReadData ${aidHex}/${fileId}`, readDataApdu(fileId, readLength), commandLog);
      file.rawDataHex = bytesToHex(readResult.data);
      file.status = readResult.status;
      file.statusLabel = readResult.statusLabel;
    } else if (settings?.fileType === 'value') {
      file.readAttempted = true;
      // Read-only value lookup. No credit/debit/write/key commands are implemented here.
      const valueResult = await transceive(`GetValue ${aidHex}/${fileId}`, getValueApdu(fileId), commandLog);
      file.rawDataHex = bytesToHex(valueResult.data);
      file.status = valueResult.status;
      file.statusLabel = valueResult.statusLabel;
    } else {
      file.readBlockedReason = 'Nur Data- und Value-Files werden automatisch gelesen.';
    }

    files.push(file);
  }

  return {
    aid: aidHex,
    fileIds,
    files,
    status: fileIdsResult.status,
    statusLabel: fileIdsResult.statusLabel,
  };
}

async function scanKnownBalanceProfiles(commandLog: DesfireCommandLog[]): Promise<BalanceCandidate[]> {
  const candidates: BalanceCandidate[] = [];

  // Known read-only Mensa card layouts from the open-source F-Droid app "Mensa-Guthaben".
  // These paths only use DESFire select/read commands against fixed applications and files;
  // there is no authentication bypass, brute force, key dumping, emulation, or write command.
  const magnaCartaSelect = await transceive('KnownProfile MagnaCarta SelectApplication F0 80 F3', selectApplicationApdu([0xF0, 0x80, 0xF3]), commandLog);
  if (magnaCartaSelect.ok) {
    const fileId = 2;
    const readResult = await transceive('KnownProfile MagnaCarta ReadData file 2', readDataApdu(fileId, 0), commandLog);
    if (readResult.ok && readResult.data.length >= 8) {
      const rawValue = ((readResult.data[6] & 0xFF) << 8) | (readResult.data[7] & 0xFF);
      const candidate = candidateFromTenthsOfCent(rawValue * 10, 'MagnaCarta AID F0 80 F3 File 2', 'Mensa-Guthaben bytes[6..7] big-endian x10', bytesToHex(readResult.data), 110);
      if (candidate) {
        candidates.push(candidate);
      }
    }
  }

  const intercardSelect = await transceive('KnownProfile Intercard SelectApplication 5F 84 15', selectApplicationApdu([0x5F, 0x84, 0x15]), commandLog);
  if (intercardSelect.ok) {
    const fileId = 1;
    const settingsResult = await transceive('KnownProfile Intercard GetFileSettings file 1', getFileSettingsApdu(fileId), commandLog);
    const settings = settingsResult.ok ? parseFileSettings(fileId, settingsResult.data) : null;
    if (settings?.fileType === 'value') {
      const valueResult = await transceive('KnownProfile Intercard GetValue file 1', getValueApdu(fileId), commandLog);
      const amountTenths = signedDesfireValue(valueResult.data);
      const candidate = amountTenths === null ? null : candidateFromTenthsOfCent(amountTenths, 'Intercard AID 5F 84 15 File 1', 'DESFire GetValue tenths of cent', bytesToHex(valueResult.data), 120);
      if (candidate) {
        candidates.push(candidate);
      }

      if (settings.limitedCreditValue !== undefined) {
        const lastTransaction = candidateFromTenthsOfCent(settings.limitedCreditValue, 'Intercard AID 5F 84 15 File 1', 'Value file settings last transaction', settings.rawHex, 70);
        if (lastTransaction) {
          candidates.push(lastTransaction);
        }
      }
    }
  }

  return candidates;
}

export async function getNfcAvailability(): Promise<NfcAvailability> {
  await NfcManager.start();
  const supported = await NfcManager.isSupported();
  const enabled = supported ? await NfcManager.isEnabled() : false;
  return { enabled, supported };
}

export async function scanDesfireCard(): Promise<DesfireScanResult> {
  const commandLog: DesfireCommandLog[] = [];

  await NfcManager.start();

  try {
    await NfcManager.requestTechnology(NfcTech.IsoDep);

    if (Platform.OS === 'android') {
      await NfcManager.setTimeout(ISO_DEP_TRANSCEIVE_TIMEOUT_MS).catch(() => undefined);
    }

    const tag = normalizeTag(await withTimeout(NfcManager.getTag(), 'Tag-Metadaten') as NativeTag | null);
    const knownProfileCandidates = await scanKnownBalanceProfiles(commandLog);
    const applicationResult = await transceive('GetApplicationIDs', APDU.getApplicationIds, commandLog);
    const aids = applicationResult.ok ? parseApplicationIds(applicationResult.data) : [];
    const applications: DesfireApplication[] = [];

    for (const aid of aids) {
      applications.push(await scanApplication(aid, commandLog));
    }

    const files = applications.flatMap((application) => application.files);
    const balanceCandidates = [...knownProfileCandidates, ...findBalanceCandidates(files)]
      .sort((left, right) => right.confidence - left.confidence);

    return {
      applications,
      balance: balanceCandidates[0] ?? null,
      balanceCandidates,
      cardType: 'MIFARE DESFire EV1 / ISO-DEP',
      commandLog,
      readableFileCount: files.filter((file) => file.readAttempted && file.status === '9100').length,
      scannedAt: new Date().toISOString(),
      tag,
      uid: tag.id ?? 'Unbekannt',
    };
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => undefined);
  }
}
