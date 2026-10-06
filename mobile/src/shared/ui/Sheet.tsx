import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, space, useTheme } from '@/shared/theme';

import { IconButton } from './Button';
import { Text } from './Text';

/**
 * Panneau du bas (bottom sheet) : coins arrondis à 24 px, poignée, fond assombri.
 * Les actions restent dans la zone du pouce plutôt que dans de nouvelles pages.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  tall?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onClose}
          accessibilityLabel="Fermer"
        />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + space.md, maxHeight: tall ? '92%' : '85%' },
            tall && { height: '92%' },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
          <View style={styles.header}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="headlineLg">{title}</Text>
              {subtitle ? (
                <Text variant="monoSm" tone="muted">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <IconButton icon="x" label="Fermer" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    shadowColor: '#1A1918',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingHorizontal: space.margin, paddingTop: space.sm },
  body: { paddingHorizontal: space.margin, paddingBottom: space.md, gap: space.md },
  footer: { paddingHorizontal: space.margin, paddingTop: space.sm, gap: space.sm },
});
