import { useThemePreference } from '@/contexts/theme-preference-context';

export function useColorScheme() {
  return useThemePreference().colorScheme;
}
