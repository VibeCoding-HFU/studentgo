import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeableTabView } from '@/components/swipeable-tab-view';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { AdvancedCardDetails } from '@/src/components/AdvancedCardDetails';
import { getNfcAvailability, scanDesfireCard } from '@/src/nfc/desfire';
import type { DesfireScanResult, NfcAvailability } from '@/src/nfc/types';

export function NfcScannerScreen() {
  const styles = useThemedStyles(baseStyles);
  const [availability, setAvailability] = useState<NfcAvailability | null>(null);
  const [result, setResult] = useState<DesfireScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState('');
  const isWeb = Platform.OS === 'web';

  const loadAvailability = useCallback(async () => {
    try {
      setAvailability(await getNfcAvailability());
    } catch {
      setAvailability({ enabled: false, supported: false });
    }
  }, []);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const statusText = useMemo(() => {
    if (isWeb) {
      return 'NFC ist in der Web-Version nicht verfuegbar. Eine Mensakarte kann hier deshalb nicht ausgelesen werden.';
    }

    if (Platform.OS !== 'android') {
      return 'Android-first: NFC-Scan ist fuer Android vorbereitet.';
    }

    if (!availability) {
      return 'NFC-Status wird geprueft.';
    }

    if (!availability.supported) {
      return 'Dieses Geraet meldet keine NFC-Unterstuetzung.';
    }

    if (!availability.enabled) {
      return 'NFC ist deaktiviert. Aktiviere NFC in den Android-Einstellungen.';
    }

    return 'Bereit fuer eine MIFARE DESFire EV1 Mensakarte.';
  }, [availability, isWeb]);

  async function scanCard() {
    setError('');

    if (isWeb) {
      setError('NFC ist in der Web-Version nicht verfuegbar. Nutze die Android-App, um eine Mensakarte auszulesen.');
      return;
    }

    setIsScanning(true);

    try {
      const nextAvailability = await getNfcAvailability();
      setAvailability(nextAvailability);

      if (!nextAvailability.supported) {
        setError('Dieses Geraet unterstuetzt NFC nicht.');
        return;
      }

      if (!nextAvailability.enabled) {
        setError('NFC ist ausgeschaltet. Bitte aktiviere NFC und versuche es erneut.');
        return;
      }

      const scanResult = await scanDesfireCard();
      setResult(scanResult);
      setAdvancedOpen(false);

      if (scanResult.commandLog.some((entry) => entry.status === 'TRANSCEIVE_FAILED')) {
        setError('Die Karte wurde nicht stabil gelesen. Halte sie flach und ruhig an die NFC-Antenne und scanne erneut.');
      } else if (!scanResult.balance) {
        setError('Die Karte wurde gelesen, aber es wurde kein plausibles frei lesbares Guthaben erkannt.');
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Die Karte konnte nicht gelesen werden.');
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <SwipeableTabView>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.kicker}>Mensakarte</Text>
            <Text style={styles.title}>NFC-Guthaben</Text>
            <Text style={styles.subtitle}>Read-only Analyse fuer eigene DESFire-Karten. Es werden keine Schreib-, Key- oder Authentifizierungsumgehungs-Kommandos verwendet.</Text>
          </View>

          {isWeb ? (
            <View style={styles.webNotice}>
              <MaterialIcons name="web-asset-off" size={24} color="#B54708" />
              <View style={styles.webNoticeTextBlock}>
                <Text style={styles.webNoticeTitle}>NFC im Web nicht verfuegbar</Text>
                <Text style={styles.webNoticeText}>Browser koennen die Mensakarte hier nicht ueber NFC auslesen. Fuer den Kartenscan brauchst du die native Android-Version.</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.balancePanel}>
            <View style={styles.balanceIcon}>
              <MaterialIcons name="account-balance-wallet" size={30} color="#00684F" />
            </View>
            <Text style={styles.balanceLabel}>Aktuelles Guthaben</Text>
            <Text style={styles.balanceValue}>{result?.balance?.formatted ?? '--,-- EUR'}</Text>
            <Text style={styles.balanceMeta}>
              {result?.balance ? `${result.balance.source} · ${result.balance.parser}` : 'Scanne deine Karte, um frei lesbare Werte zu pruefen.'}
            </Text>
          </View>

          <Pressable disabled={isScanning || isWeb} style={[styles.scanButton, (isScanning || isWeb) && styles.scanButtonDisabled]} onPress={scanCard}>
            {isScanning ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="nfc" size={24} color="#FFFFFF" />}
            <Text style={styles.scanButtonText}>{isScanning ? 'Karte lesen' : 'Karte scannen'}</Text>
          </Pressable>

          <Text style={styles.statusText}>{statusText}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{result?.cardType ?? '-'}</Text>
              <Text style={styles.summaryLabel}>Kartentyp</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text selectable style={styles.summaryValue}>{result?.uid ?? '-'}</Text>
              <Text style={styles.summaryLabel}>UID</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{result?.applications.length ?? 0}</Text>
              <Text style={styles.summaryLabel}>Applications</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{result?.readableFileCount ?? 0}</Text>
              <Text style={styles.summaryLabel}>Frei lesbare Files</Text>
            </View>
          </View>

          {isScanning ? (
            <View style={styles.scanHint}>
              <ActivityIndicator color="#00684F" />
              <Text style={styles.scanHintText}>Halte die Karte ruhig an die NFC-Antenne.</Text>
            </View>
          ) : null}

          <AdvancedCardDetails result={result} open={advancedOpen} onToggle={() => setAdvancedOpen((current) => !current)} />
        </ScrollView>
      </SwipeableTabView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  balanceIcon: {
    alignItems: 'center',
    backgroundColor: '#E7F4EF',
    borderRadius: 8,
    height: 54,
    justifyContent: 'center',
    marginBottom: 16,
    width: 54,
  },
  balanceLabel: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  balanceMeta: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  balancePanel: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 18,
    minHeight: 220,
    padding: 24,
  },
  balanceValue: {
    color: '#101828',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 50,
    marginTop: 8,
    textAlign: 'center',
  },
  container: {
    padding: 20,
    paddingBottom: 36,
  },
  errorText: {
    color: '#B42318',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 14,
    marginTop: 8,
  },
  header: {
    marginBottom: 18,
  },
  kicker: {
    color: '#00684F',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  safeArea: {
    backgroundColor: '#F5F7FB',
    flex: 1,
  },
  scanButton: {
    alignItems: 'center',
    backgroundColor: '#00684F',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 56,
  },
  scanButtonDisabled: {
    opacity: 0.75,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  scanHint: {
    alignItems: 'center',
    backgroundColor: '#E7F4EF',
    borderColor: '#B7E2D1',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    padding: 12,
  },
  scanHintText: {
    color: '#004B3A',
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  statusText: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  subtitle: {
    color: '#667085',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  summaryItem: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 86,
    padding: 12,
    width: '48%',
  },
  summaryLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  title: {
    color: '#101828',
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 35,
  },
  webNotice: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFAEB',
    borderColor: '#FEDF89',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
    padding: 14,
  },
  webNoticeText: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  webNoticeTextBlock: {
    flex: 1,
  },
  webNoticeTitle: {
    color: '#B54708',
    fontSize: 15,
    fontWeight: '900',
  },
});
