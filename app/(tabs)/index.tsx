import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackendStatusBadge } from '@/components/backend-status-badge';
import { SyncStatusBadge } from '@/components/sync-status-badge';
import { useAuth } from '@/contexts/auth-context';
import { useThemedStyles } from '@/hooks/use-themed-styles';

type ModuleTile = {
  accent: string;
  description: string;
  href: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
};

const primaryTiles: ModuleTile[] = [
  {
    accent: '#00684F',
    description: 'Stundenplan, Mensa und Tagesueberblick',
    href: '/schedule',
    icon: 'calendar-month',
    title: 'Plan',
  },
  {
    accent: '#1D4ED8',
    description: 'Aufgaben, Unteraufgaben und Notizen',
    href: '/deadlines',
    icon: 'checklist',
    title: 'To-Do',
  },
  {
    accent: '#C11574',
    description: 'Persoenliche Kontakte und HFU-Verzeichnis',
    href: '/contacts',
    icon: 'contacts',
    title: 'Kontakt',
  },
  {
    accent: '#B54708',
    description: 'Mensa-Karte und NFC-Scan',
    href: '/nfc',
    icon: 'nfc',
    title: 'Mensa',
  },
  {
    accent: '#475467',
    description: 'Module, SPO und Studienverlauf',
    href: '/curriculum',
    icon: 'school',
    title: 'Studium',
  },
  {
    accent: '#7A2E27',
    description: 'Profil, Anmeldung und Sicherheit',
    href: '/account',
    icon: 'account-circle',
    title: 'Account',
  },
];

export default function HomeScreen() {
  const styles = useThemedStyles(baseStyles);
  const router = useRouter();
  const { isAdminMode, isManagerMode, user } = useAuth();
  const tiles = [
    ...primaryTiles,
    ...(user
      ? [{
          accent: '#92400E',
          description: 'Einladungen und offene Rueckmeldungen',
          href: '/requests',
          icon: 'notifications' as const,
          title: 'Anfragen',
        }]
      : []),
    ...(isManagerMode && !isAdminMode
      ? [{
          accent: '#047857',
          description: 'Aenderungen vorbereiten und einreichen',
          href: '/manager',
          icon: 'edit-note' as const,
          title: 'Verwalter',
        }]
      : []),
    ...(isAdminMode
      ? [{
          accent: '#B42318',
          description: 'Benutzer und Aenderungen verwalten',
          href: '/admin',
          icon: 'admin-panel-settings' as const,
          title: 'Admin',
        }]
      : []),
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image
              accessibilityIgnoresInvertColors
              source={require('@/assets/images/splash-icon-transparent.png')}
              style={styles.logo}
            />
            <View style={styles.brandText}>
              <Text style={styles.title}>StudentGo</Text>
              <Text style={styles.subtitle}>
                {user ? `Hallo ${user.name}. Waehle ein Modul.` : 'Waehle ein Modul oder melde dich im Account an.'}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <BackendStatusBadge />
            <SyncStatusBadge />
          </View>
        </View>

        <View style={styles.tileGrid}>
          {tiles.map((tile) => (
            <Pressable
              accessibilityRole="button"
              key={tile.href}
              onPress={() => router.push(tile.href as never)}
              style={({ pressed }) => [styles.tile, pressed ? styles.tilePressed : null]}
            >
              <View style={[styles.iconBox, { backgroundColor: `${tile.accent}14`, borderColor: `${tile.accent}40` }]}>
                <MaterialIcons name={tile.icon} size={28} color={tile.accent} />
              </View>
              <View style={styles.tileText}>
                <Text style={styles.tileTitle}>{tile.title}</Text>
                <Text style={styles.tileDescription}>{tile.description}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#98A2B3" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F5F7FB',
    flex: 1,
  },
  container: {
    gap: 18,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    gap: 16,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  brandText: {
    flex: 1,
  },
  logo: {
    height: 96,
    resizeMode: 'contain',
    width: 96,
  },
  title: {
    color: '#00684F',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  subtitle: {
    color: '#667085',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  statusRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tileGrid: {
    gap: 12,
  },
  tile: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 94,
    padding: 14,
  },
  tilePressed: {
    opacity: 0.72,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  tileText: {
    flex: 1,
    gap: 4,
  },
  tileTitle: {
    color: '#101828',
    fontSize: 17,
    fontWeight: '800',
  },
  tileDescription: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
  },
});
