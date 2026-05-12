import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DesfireApplication, DesfireCommandLog, DesfireScanResult } from '@/src/nfc/types';

type Props = {
  result: DesfireScanResult | null;
  open: boolean;
  onToggle: () => void;
};

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return 'Nicht serialisierbar';
  }
}

function ApplicationDetails({ application }: { application: DesfireApplication }) {
  return (
    <View style={styles.applicationBlock}>
      <DetailRow label="AID" value={application.aid} />
      <DetailRow label="Status" value={`${application.status} - ${application.statusLabel}`} />
      <DetailRow label="File IDs" value={application.fileIds.length ? application.fileIds.join(', ') : 'Keine frei sichtbaren File IDs'} />

      {application.files.map((file) => (
        <View key={file.id} style={styles.fileBlock}>
          <Text style={styles.fileTitle}>File {file.id}</Text>
          <DetailRow label="Read free" value={file.readFree ? 'Ja' : 'Nein'} />
          <DetailRow label="Read attempted" value={file.readAttempted ? 'Ja' : 'Nein'} />
          <DetailRow label="Status" value={`${file.status ?? '-'} ${file.statusLabel ?? ''}`.trim()} />
          {file.readBlockedReason ? <DetailRow label="Hinweis" value={file.readBlockedReason} /> : null}
          {file.settings ? (
            <>
              <DetailRow label="Typ" value={`${file.settings.fileType} (${file.settings.fileTypeCode ?? '-'})`} />
              <DetailRow label="Comm Mode" value={file.settings.communicationMode ?? '-'} />
              <DetailRow label="Access Rights" value={file.settings.accessRights?.rawHex ?? '-'} />
              {file.settings.fileSize !== undefined ? <DetailRow label="Groesse" value={`${file.settings.fileSize} Bytes`} /> : null}
              {file.settings.lowerLimit !== undefined ? <DetailRow label="Value Limits" value={`${file.settings.lowerLimit} bis ${file.settings.upperLimit}`} /> : null}
              <DetailRow label="Settings Hex" value={file.settings.rawHex || '-'} />
            </>
          ) : null}
          <DetailRow label="Rohdaten" value={file.rawDataHex || '-'} />
        </View>
      ))}
    </View>
  );
}

function CommandLog({ log }: { log: DesfireCommandLog[] }) {
  return (
    <View style={styles.logList}>
      {log.map((entry, index) => (
        <View key={`${entry.command}-${index}`} style={styles.logEntry}>
          <Text style={styles.logTitle}>{entry.command}</Text>
          <DetailRow label="Request" value={entry.requestHex} />
          <DetailRow label="Response" value={entry.responseHex} />
          <DetailRow label="Status" value={`${entry.status} - ${entry.statusLabel}`} />
        </View>
      ))}
    </View>
  );
}

export function AdvancedCardDetails({ result, open, onToggle }: Props) {
  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.toggle} onPress={onToggle}>
        <View style={styles.toggleText}>
          <Text style={styles.toggleTitle}>Erweitert</Text>
          <Text style={styles.toggleMeta}>Applications, Files, Hexdaten und Statuscodes</Text>
        </View>
        <MaterialIcons name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={28} color="#475467" />
      </Pressable>

      {open ? (
        <View style={styles.content}>
          {result ? (
            <>
              <Text style={styles.sectionTitle}>Karte</Text>
              <DetailRow label="Kartentyp" value={result.cardType} />
              <DetailRow label="UID" value={result.uid} />
              <DetailRow label="Scan" value={new Date(result.scannedAt).toLocaleString('de-DE')} />
              <DetailRow label="Tech Types" value={result.tag.techTypes?.join(', ') || '-'} />
              <DetailRow label="Applications" value={result.applications.length} />
              <DetailRow label="Frei lesbare Files" value={result.readableFileCount} />
              <DetailRow label="Tag Raw" value={safeJson(result.tag.raw)} />

              <Text style={styles.sectionTitle}>Gefundene Applications</Text>
              {result.applications.length ? result.applications.map((application) => (
                <ApplicationDetails key={application.aid} application={application} />
              )) : <Text style={styles.emptyText}>Keine frei sichtbaren Applications gefunden.</Text>}

              <Text style={styles.sectionTitle}>Guthaben-Kandidaten</Text>
              {result.balanceCandidates.length ? result.balanceCandidates.slice(0, 8).map((candidate) => (
                <View key={`${candidate.source}-${candidate.parser}-${candidate.rawHex}`} style={styles.candidate}>
                  <Text style={styles.candidateAmount}>{candidate.formatted}</Text>
                  <Text style={styles.candidateMeta}>{candidate.source} · {candidate.parser} · Score {candidate.confidence}</Text>
                  <Text selectable style={styles.hexText}>{candidate.rawHex}</Text>
                </View>
              )) : <Text style={styles.emptyText}>Keine plausiblen Eurobetraege erkannt.</Text>}

              <Text style={styles.sectionTitle}>APDU Log</Text>
              <CommandLog log={result.commandLog} />
            </>
          ) : (
            <Text style={styles.emptyText}>Noch keine Kartendaten gescannt.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  applicationBlock: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
    padding: 12,
  },
  candidate: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    padding: 10,
  },
  candidateAmount: {
    color: '#00684F',
    fontSize: 18,
    fontWeight: '900',
  },
  candidateMeta: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  content: {
    padding: 14,
  },
  detailLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailRow: {
    gap: 3,
  },
  detailValue: {
    color: '#101828',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  emptyText: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
  },
  fileBlock: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  fileTitle: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '900',
  },
  hexText: {
    color: '#344054',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  logEntry: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
    padding: 10,
  },
  logList: {
    gap: 2,
  },
  logTitle: {
    color: '#101828',
    fontSize: 14,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#101828',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 14,
  },
  toggle: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 62,
    paddingHorizontal: 14,
  },
  toggleMeta: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  toggleText: {
    flex: 1,
    paddingRight: 12,
  },
  toggleTitle: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '900',
  },
  wrapper: {
    marginTop: 18,
  },
});
