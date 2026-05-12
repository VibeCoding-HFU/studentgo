export type DesfireStatusCode = '9100' | '91AF' | '91AE' | '919D' | string;

export type DesfireCommandLog = {
  command: string;
  requestHex: string;
  responseHex: string;
  status: DesfireStatusCode;
  statusLabel: string;
  dataHex: string;
  ok: boolean;
  continued: boolean;
  errorMessage?: string;
};

export type DesfireAccessRights = {
  rawHex: string;
  readKey: number | null;
  writeKey: number | null;
  readWriteKey: number | null;
  changeKey: number | null;
  isReadFree: boolean;
};

export type DesfireFileType =
  | 'standard-data'
  | 'backup-data'
  | 'value'
  | 'linear-record'
  | 'cyclic-record'
  | 'unknown';

export type DesfireFileSettings = {
  fileId: number;
  rawHex: string;
  fileType: DesfireFileType;
  fileTypeCode: number | null;
  communicationMode: number | null;
  accessRights: DesfireAccessRights | null;
  fileSize?: number;
  lowerLimit?: number;
  upperLimit?: number;
  limitedCreditValue?: number;
  limitedCreditEnabled?: boolean;
  recordSize?: number;
  maxRecords?: number;
  currentRecords?: number;
};

export type DesfireFile = {
  id: number;
  settings: DesfireFileSettings | null;
  rawDataHex?: string;
  status?: DesfireStatusCode;
  statusLabel?: string;
  readAttempted: boolean;
  readFree: boolean;
  readBlockedReason?: string;
};

export type DesfireApplication = {
  aid: string;
  fileIds: number[];
  files: DesfireFile[];
  status: DesfireStatusCode;
  statusLabel: string;
};

export type NfcTagMetadata = {
  id?: string;
  techTypes?: string[];
  type?: string;
  raw?: unknown;
};

export type BalanceCandidate = {
  amountCents: number;
  amountEuro: number;
  formatted: string;
  source: string;
  parser: string;
  confidence: number;
  rawHex: string;
};

export type DesfireScanResult = {
  scannedAt: string;
  cardType: string;
  uid: string;
  tag: NfcTagMetadata;
  applications: DesfireApplication[];
  commandLog: DesfireCommandLog[];
  balanceCandidates: BalanceCandidate[];
  balance: BalanceCandidate | null;
  readableFileCount: number;
};

export type NfcAvailability = {
  supported: boolean;
  enabled: boolean;
};
