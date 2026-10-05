import { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { settingsStore } from '@/shared/storage';

import { dark, light, type Palette } from './tokens';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  colors: Palette;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const KEY = 'theme';
const ThemeContext = createContext<ThemeState>({
  colors: light,
  isDark: false,
  preference: 'system',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => (settingsStore.getString(KEY) as ThemePreference | undefined) ?? 'system',
  );
  const isDark = preference === 'dark' || (preference === 'system' && system === 'dark');

  const value = useMemo<ThemeState>(
    () => ({
      colors: isDark ? dark : light,
      isDark,
      preference,
      setPreference: (next) => {
        settingsStore.set(KEY, next);
        setPreferenceState(next);
      },
    }),
    [isDark, preference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/** Styles dépendant du thème, recalculés seulement quand la palette change. */
export function useStyles<T>(factory: (colors: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
