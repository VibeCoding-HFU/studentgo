import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { useSync } from '@/contexts/sync-context';
import { useThemedStyles } from '@/hooks/use-themed-styles';

export function SyncStatusBadge() {
  const styles = useThemedStyles(baseStyles);
  const { pendingCount, syncing } = useSync();
  const isSynced = pendingCount === 0;
  const isSyncing = syncing && pendingCount > 0;
  const label = isSynced
    ? 'Alles synchronisiert'
    : isSyncing
      ? `${pendingCount} Synchronisierung${pendingCount === 1 ? '' : 'en'} laufen`
      : `${pendingCount} Synchronisierung${pendingCount === 1 ? '' : 'en'} ausstehend`;
  const iconName = isSynced ? 'cloud-done' : isSyncing ? 'sync' : 'cloud-upload';

  return (
    <View
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={[styles.badge, isSynced ? styles.online : isSyncing ? styles.checking : styles.offline]}>
      <View style={[styles.dot, isSynced ? styles.onlineDot : isSyncing ? styles.checkingDot : styles.offlineDot]} />
      <MaterialIcons
        color={isSynced ? '#047857' : isSyncing ? '#92400E' : '#B42318'}
        name={iconName}
        size={18}
      />
      <Text style={[styles.label, isSynced ? styles.onlineText : isSyncing ? styles.checkingText : styles.offlineText]}>
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
