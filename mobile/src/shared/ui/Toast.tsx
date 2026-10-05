import { createContext, useCallback, useContext, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, space, useTheme } from '@/shared/theme';

import { Icon, Text } from './Text';

type Tone = 'success' | 'error' | 'queued';
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

/** Messages éphémères au-dessus de la barre d'onglets (annoncés aux lecteurs d'écran). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current.slice(-1), { id, message, tone }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <View pointerEvents="none" style={[styles.stack, { bottom: insets.bottom + 96 }]}>
        {items.map((item) => (
          <View
            key={item.id}
            accessibilityLiveRegion="polite"
            style={[
              styles.toast,
              {
                backgroundColor:
                  item.tone === 'error' ? colors.dangerSoft : item.tone === 'queued' ? colors.tertiarySoft : colors.secondaryMint,
              },
            ]}
          >
            <Icon
              name={item.tone === 'error' ? 'x-circle' : item.tone === 'queued' ? 'clock' : 'check-circle'}
              size={18}
              tone={item.tone === 'error' ? 'danger' : item.tone === 'queued' ? 'tertiary' : 'secondary'}
            />
            <Text variant="small" style={{ flex: 1 }}>
              {item.message}
            </Text>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  stack: { position: 'absolute', left: space.md, right: space.md, gap: space.sm },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.lg },
});
