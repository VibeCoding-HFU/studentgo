export type ThemePreference = 'dark' | 'light';

const themePreferenceKey = 'studentgo-theme-preference';

export async function getStoredThemePreference(): Promise<ThemePreference | null> {
  try {
    const value = globalThis.localStorage?.getItem(themePreferenceKey);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export async function saveThemePreference(preference: ThemePreference) {
  globalThis.localStorage?.setItem(themePreferenceKey, preference);
}
