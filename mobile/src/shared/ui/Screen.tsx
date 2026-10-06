import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, type ScrollViewProps, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle, Path, Rect } from 'react-native-svg';

import { radius, space, useTheme } from '@/shared/theme';

import { IconButton } from './Button';
import { Sheet } from './Sheet';
import { Icon, type IconName, Text } from './Text';

/** Marque AfriDev : le même SVG que le web (chevrons de code sur terracotta, point vert). */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 120 120" width={size} height={size} accessibilityLabel="AfriDev Exchange">
      <Rect width="120" height="120" rx="30" fill="#C84B20" />
      <Path d="M48 38L26 60L48 82" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M72 38L94 60L72 82" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <SvgCircle cx="60" cy="60" r="8" fill="#3DDC84" />
    </Svg>
  );
}

/** « afridev. » : la marque complète des barres du haut. */
export function Wordmark() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityLabel="AfriDev Exchange">
      <LogoMark size={30} />
      <Text variant="headlineLg" style={{ fontSize: 20, letterSpacing: -0.6 }}>
        afridev<Text variant="headlineLg" style={{ fontSize: 20, color: colors.primary }}>.</Text>
      </Text>
    </View>
  );
}

/**
 * Barre du haut des onglets (façon Reddit mobile) : la marque à gauche, ou un titre court,
 * et les actions à droite (recherche, notifications, avatar).
 */
export function AppBar({ title, right }: { title?: string; right?: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [menu, setMenu] = useState(false);
  return (
    <View style={[styles.appBar, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top }]}>
      <IconButton icon="menu" label="Menu" onPress={() => setMenu(true)} />
      <NavMenu open={menu} onClose={() => setMenu(false)} />
      <View style={{ flex: 1, minWidth: 0 }}>
        {title ? (
          <Text variant="headlineLg" numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <Wordmark />
        )}
      </View>
      <View style={styles.actions}>{right}</View>
    </View>
  );
}

// Mêmes entrées que le menu du web (web/src/shared/layout/nav.ts).
const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/feed', label: 'Accueil', icon: 'home' },
  { href: '/questions', label: 'Entraide & IA', icon: 'messages-square' },
  { href: '/snippets', label: 'Mon coffre de snippets', icon: 'code-xml' },
  { href: '/projects', label: 'Projets open source', icon: 'folder-git' },
  { href: '/profile', label: 'Mon profil', icon: 'user-round' },
  { href: '/settings', label: 'Réglages', icon: 'settings' },
];

/** Menu ☰ : la navigation complète, comme le tiroir du web sur téléphone. */
function NavMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const pathname = usePathname();
  return (
    <Sheet open={open} onClose={onClose} title="Menu">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Pressable
            key={item.href}
            onPress={() => {
              onClose();
              router.navigate(item.href as never);
            }}
            accessibilityRole="link"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [styles.navItem, { backgroundColor: active ? colors.container : pressed ? colors.container : 'transparent' }]}
          >
            <Icon name={item.icon} size={22} tone={active ? 'ink' : 'muted'} />
            <Text variant="bodyMedium" tone={active ? 'ink' : 'muted'}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </Sheet>
  );
}

/**
 * En-tête : à gauche le titre (ou la flèche retour), à droite les actions.
 * Les actions principales de l'écran restent, elles, en bas (zone du pouce).
 */
export function ScreenHeader({
  title,
  subtitle,
  back,
  logo,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  logo?: boolean;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {back ? (
        <IconButton icon="arrow-left" label="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))} />
      ) : logo ? (
        <LogoMark />
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant={logo ? 'headlineMd' : 'headlineLg'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="monoSm" tone="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>{right}</View>
    </View>
  );
}

/** Écran défilant avec « tirer pour rafraîchir » et marges de la maquette. */
export function Screen({
  header,
  children,
  refreshing,
  onRefresh,
  footer,
  scroll = true,
  embedded = false,
  ...props
}: ScrollViewProps & {
  header?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: React.ReactNode;
  scroll?: boolean;
  /** Placé sous un en-tête qui gère déjà la zone de l'encoche (onglets). */
  embedded?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={embedded ? [] : ['top']} style={[styles.root, { backgroundColor: colors.canvas }]}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
            ) : undefined
          }
          {...props}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { backgroundColor: colors.canvas, borderTopColor: colors.border }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

/** Titre de section avec action optionnelle à droite. */
export function SectionTitle({ title, hint, right }: { title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={{ flex: 1 }}>
        <Text variant="headlineMd">{title}</Text>
        {hint ? (
          <Text variant="monoSm" tone="secondary">
            {hint}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingBottom: 6,
    minHeight: 56,
    paddingLeft: space.xs,
    paddingRight: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // 12 px de marge et d'espacement entre cartes, comme le web sur téléphone.
  content: { padding: 12, gap: 12, paddingBottom: 120 },
  footer: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: space.sm,
    borderRadius: radius.sm,
  },
  section: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginTop: space.sm },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, paddingHorizontal: 14, borderRadius: radius.lg },
});
