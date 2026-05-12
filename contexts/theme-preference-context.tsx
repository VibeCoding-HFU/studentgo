import { getStoredThemePreference, saveThemePreference, ThemePreference } from '@/lib/theme-preference';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ThemePreferenceContextValue = {
  colorScheme: ThemePreference;
  isHydrated: boolean;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
  togglePreference: () => Promise<void>;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useSystemColorScheme();
  const fallbackPreference: ThemePreference = systemColorScheme === 'dark' ? 'dark' : 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>(fallbackPreference);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreference() {
      const storedPreference = await getStoredThemePreference();

      if (!cancelled) {
        setPreferenceState(storedPreference ?? fallbackPreference);
        setIsHydrated(true);
      }
    }

    loadPreference();
    return () => {
      cancelled = true;
    };
  }, [fallbackPreference]);

  async function setPreference(nextPreference: ThemePreference) {
    setPreferenceState(nextPreference);
    await saveThemePreference(nextPreference);
  }

  async function togglePreference() {
    await setPreference(preference === 'dark' ? 'light' : 'dark');
  }

  const value = useMemo<ThemePreferenceContextValue>(
    () => ({
      colorScheme: preference,
      isHydrated,
      preference,
      setPreference,
      togglePreference,
    }),
    [isHydrated, preference],
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const value = useContext(ThemePreferenceContext);

  if (!value) {
    throw new Error('useThemePreference must be used inside ThemePreferenceProvider.');
  }

  return value;
}
