import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getBackendUrl } from '@/constants/api';
import { useSync } from '@/contexts/sync-context';
import { useThemedStyles } from '@/hooks/use-themed-styles';

type BackendStatus = 'checking' | 'online' | 'offline';

const checkIntervalMs = 15000;
const requestTimeoutMs = 4000;

export function SyncStatusBadge() {
  const styles = useThemedStyles(baseStyles);
  const { pendingCount, syncing } = useSync();
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const backendOnline = backendStatus === 'online';
  const backendChecking = backendStatus === 'checking';
  const isSynced = backendOnline && pendingCount === 0;
  const isSyncing = backendOnline && syncing && pendingCount > 0;
  const isChecking = backendChecking && pendingCount === 0;
  const label = !backendOnline && !backendChecking
    ? pendingCount > 0
      ? `${pendingCount} Synchronisierung${pendingCount === 1 ? '' : 'en'} ausstehend, Backend nicht erreichbar`
      : 'Backend nicht erreichbar'
    : isChecking
      ? 'Synchronisierung wird geprueft'
      : isSynced
        ? 'Alles synchronisiert'
        : isSyncing
          ? `${pendingCount} Synchronisierung${pendingCount === 1 ? '' : 'en'} laufen`
          : `${pendingCount} Synchronisierung${pendingCount === 1 ? '' : 'en'} ausstehend`;
  const iconName = isSynced ? 'cloud-done' : isChecking || isSyncing ? 'sync' : backendOnline ? 'cloud-upload' : 'cloud-off';
  const isWarning = isChecking || isSyncing;

  useEffect(() => {
    let isMounted = true;

    async function checkBackend() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

      try {
        const response = await fetch(`${backendUrl}/health`, {
          signal: controller.signal,
        });

        if (isMounted) {
          setBackendStatus(response.ok ? 'online' : 'offline');
        }
      } catch {
        if (isMounted) {
          setBackendStatus('offline');
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    checkBackend();
    const interval = setInterval(checkBackend, checkIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [backendUrl]);

  return (
    <View
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={[styles.badge, isSynced ? styles.online : isWarning ? styles.checking : styles.offline]}>
      <View style={[styles.dot, isSynced ? styles.onlineDot : isWarning ? styles.checkingDot : styles.offlineDot]} />
      <MaterialIcons
        color={isSynced ? '#047857' : isWarning ? '#92400E' : '#B42318'}
        name={iconName}
        size={18}
      />
      <Text style={[styles.label, isSynced ? styles.onlineText : isWarning ? styles.checkingText : styles.offlineText]}>
        {label}
      </Text>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  checking: {
    backgroundColor: '#FFFAEB',
    borderColor: '#FEDF89',
  },
  checkingDot: {
    backgroundColor: '#F59E0B',
  },
  checkingText: {
    color: '#92400E',
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  offline: {
    backgroundColor: '#FEF3F2',
    borderColor: '#FECDCA',
  },
  offlineDot: {
    backgroundColor: '#D92D20',
  },
  offlineText: {
    color: '#B42318',
  },
  online: {
    backgroundColor: '#ECFDF3',
    borderColor: '#ABEFC6',
  },
  onlineDot: {
    backgroundColor: '#12B76A',
  },
  onlineText: {
    color: '#047857',
  },
});
