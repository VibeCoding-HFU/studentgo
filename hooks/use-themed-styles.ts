import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

const darkBackgroundColorMap: Record<string, string> = {
  '#FFFFFF': '#101828',
  '#F5F7FB': '#0B1411',
  '#F9FAFB': '#15231F',
  '#EAECF0': '#273A34',
  '#E4E7EC': '#2D423B',
  '#D0D5DD': '#3C524A',
  '#EEF4FF': '#15362C',
  '#E7F4EF': '#15362C',
  '#ECFDF3': '#15362C',
  '#F0FDF4': '#15362C',
  '#FEF3F2': '#3A1D1A',
  '#FECDCA': '#7A2E27',
  '#FFFAEB': '#33240B',
  '#FEDF89': '#7A4B0F',
};

const darkBorderColorMap: Record<string, string> = {
  '#FFFFFF': '#344054',
  '#F9FAFB': '#344054',
  '#EAECF0': '#344054',
  '#E4E7EC': '#344054',
  '#D0D5DD': '#3C524A',
  '#E7F4EF': '#245545',
  '#ECFDF3': '#245545',
  '#93D3BA': '#337A63',
  '#A6F4C5': '#337A63',
  '#B7E2D1': '#337A63',
  '#22C55E': '#2F8D62',
  '#FECDCA': '#7A2E27',
  '#FEDF89': '#7A4B0F',
  '#ABEFC6': '#1D6B4A',
};

const darkTextColorMap: Record<string, string> = {
  '#101828': '#F9FAFB',
  '#344054': '#E4E7EC',
  '#475467': '#D0D5DD',
  '#667085': '#98A2B3',
  '#004B3A': '#B7E2D1',
  '#B54708': '#FEC84B',
};

function mapDarkColor(key: string, value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.toUpperCase();
  const normalizedKey = key.toLowerCase();

  if (normalizedKey.includes('background')) {
    return darkBackgroundColorMap[normalizedValue] ?? value;
  }

  if (normalizedKey.includes('border')) {
    return darkBorderColorMap[normalizedValue] ?? value;
  }

  if (normalizedKey.includes('color')) {
    return darkTextColorMap[normalizedValue] ?? value;
  }

  return value;
}

function mapDarkStyle(style: unknown): unknown {
  const flattened = StyleSheet.flatten(style);

  if (!flattened) {
    return flattened;
  }

  return Object.fromEntries(
    Object.entries(flattened).map(([key, value]) => [key, key.toLowerCase().includes('color') ? mapDarkColor(key, value) : value]),
  );
}

export function useThemedStyles<T extends Record<string, unknown>>(styles: T): T {
  const colorScheme = useColorScheme();

  return useMemo(() => {
    if (colorScheme !== 'dark') {
      return styles;
    }

    return Object.fromEntries(Object.entries(styles).map(([key, value]) => [key, mapDarkStyle(value)])) as T;
  }, [colorScheme, styles]);
}
