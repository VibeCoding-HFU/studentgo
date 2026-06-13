import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/use-themed-styles';

type ModuleHeaderProps = PropsWithChildren<{
  accent: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  kicker: string;
  subtitle: string;
  title: string;
}>;

export function ModuleHeader({ accent, children, icon, kicker, subtitle, title }: ModuleHeaderProps) {
  const styles = useThemedStyles(baseStyles);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={[styles.iconBox, { backgroundColor: `${accent}14`, borderColor: `${accent}40` }]}>
          <MaterialIcons name={icon} size={31} color={accent} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.kicker, { color: accent }]}>{kicker}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      {children ? <View style={styles.footer}>{children}</View> : null}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    gap: 12,
  },
  footer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  kicker: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#667085',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: '#101828',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
});
