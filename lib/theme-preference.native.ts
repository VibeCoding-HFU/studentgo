import * as SecureStore from 'expo-secure-store';

export type ThemePreference = 'dark' | 'light';

const themePreferenceKey = 'studentgo-theme-preference';

export async function getStoredThemePreference(): Promise<ThemePreference | null> {
  const value = await SecureStore.getItemAsync(themePreferenceKey);
  return value === 'dark' || value === 'light' ? value : null;
}

export async function saveThemePreference(preference: ThemePreference) {
  await SecureStore.setItemAsync(themePreferenceKey, preference);
}
