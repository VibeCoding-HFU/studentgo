import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getBackendUrl } from '@/constants/api';

type BackendStatus = 'checking' | 'online' | 'offline';

const CHECK_INTERVAL_MS = 15000;
const REQUEST_TIMEOUT_MS = 4000;

export function BackendStatusBadge() {
  const [status, setStatus] = useState<BackendStatus>('checking');
  const backendUrl = useMemo(() => getBackendUrl(), []);

  useEffect(() => {
    let isMounted = true;

    async function checkBackend() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(`${backendUrl}/health`, {
          signal: controller.signal,
        });

        if (isMounted) {
          setStatus(response.ok ? 'online' : 'offline');
        }
      } catch {
        if (isMounted) {
          setStatus('offline');
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    checkBackend();
    const interval = setInterval(checkBackend, CHECK_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [backendUrl]);

  const isOnline = status === 'online';
  const isChecking = status === 'checking';
  const label = isChecking ? 'Backend wird geprueft' : isOnline ? 'Backend verbunden' : 'Backend nicht erreichbar';
  const iconName = isChecking ? 'sync' : isOnline ? 'cloud-done' : 'cloud-off';

  return (
    <View
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={[styles.badge, isOnline ? styles.online : isChecking ? styles.checking : styles.offline]}>
      <View style={[styles.dot, isOnline ? styles.onlineDot : isChecking ? styles.checkingDot : styles.offlineDot]} />
      <MaterialIcons
        color={isOnline ? '#047857' : isChecking ? '#92400E' : '#B42318'}
        name={iconName}
        size={18}
      />
      <Text style={[styles.label, isOnline ? styles.onlineText : isChecking ? styles.checkingText : styles.offlineText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
