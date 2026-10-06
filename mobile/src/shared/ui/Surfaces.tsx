import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { useDataSaver } from '@/shared/data-saver';
import { cardShadow, radius, space, useTheme } from '@/shared/theme';

import { Icon, type IconName, Text } from './Text';

/** Carte de niveau 1 : fond blanc, bordure fine, pas d'ombre floue. */
export function Card({ style, tinted, ...props }: ViewProps & { tinted?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: tinted ? colors.container : colors.card, borderColor: tinted ? colors.borderStrong : colors.border },
        style,
      ]}
      {...props}
    />
  );
}

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'mint';

/** Pastille d'état arrondie (connectivité, statut, compteur). */
export function Pill({
  label,
  tone = 'neutral',
  icon,
  dot,
  style,
}: {
  label: string;
  tone?: Tone;
  icon?: IconName;
  dot?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const palette = {
    neutral: { bg: colors.container, fg: colors.inkMuted, border: colors.border },
    primary: { bg: colors.primarySoft, fg: colors.primaryInk, border: 'transparent' },
    success: { bg: colors.secondarySoft, fg: colors.secondaryInk, border: colors.secondary },
    mint: { bg: colors.secondaryMint, fg: colors.secondaryInk, border: 'transparent' },
    warning: { bg: colors.tertiarySoft, fg: colors.onTertiarySoft, border: colors.tertiary },
    danger: { bg: colors.dangerSoft, fg: colors.onDangerSoft, border: 'transparent' },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg, borderColor: palette.border }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: palette.fg }]} /> : null}
      {icon ? <Icon name={icon} size={12} color={palette.fg} /> : null}
      <Text variant="monoSm" style={{ color: palette.fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Tag technique monospace (#python). */
export function Tag({ label, onPress, active }: { label: string; onPress?: () => void; active?: boolean }) {
  const { colors } = useTheme();
  const content = (
    <View
      style={[
        styles.tag,
        { backgroundColor: active ? colors.primarySoft : colors.container, borderColor: active ? colors.primary : colors.border },
      ]}
    >
      <Text variant="monoSm" tone={active ? 'primary' : 'muted'}>
        #{label}
      </Text>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Tag ${label}`}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

const AVATAR_COLORS = ['#C84B20', '#1B5E3A', '#A76501', '#9F3C16', '#376757'];

/** Initiales colorées (0 octet) ; la photo s'affiche par-dessus sauf en mode « Texte seul ». */
export function Avatar({ name, uri, size = 40 }: { name: string; uri?: string | null; size?: number }) {
  const { textOnly } = useDataSaver();
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  const initials =
    name
      .split(/[\s_.-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text variant="label" style={{ color: '#FFFFFF', fontSize: Math.max(11, size * 0.36) }}>
        {initials}
      </Text>
      {uri && !textOnly ? (
        <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" transition={150} />
      ) : null}
    </View>
  );
}

/** Squelette animé (pas de spinner plein écran : la mise en page reste stable). */
export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: ViewStyle['width']; style?: ViewStyle }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ height, width, borderRadius: radius.sm, backgroundColor: colors.containerHigh, opacity }, style]} />;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <Skeleton height={40} width={40} style={{ borderRadius: 20 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton height={12} width="45%" />
          <Skeleton height={10} width="30%" />
        </View>
      </View>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? '65%' : '100%'} />
      ))}
    </Card>
  );
}

export function EmptyState({
  icon = 'inbox',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: colors.borderStrong, backgroundColor: colors.container }]}>
      <Icon name={icon} size={30} tone="faint" />
      <Text variant="headlineMd" center>
        {title}
      </Text>
      {message ? (
        <Text tone="muted" center>
          {message}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorNotice({ title = 'Impossible de charger ce contenu.', message }: { title?: string; message?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.error, { backgroundColor: colors.dangerSoft }]} accessibilityRole="alert">
      <Icon name="alert-triangle" size={20} tone="danger" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label" tone="danger">
          {title}
        </Text>
        {message ? <Text variant="small">{message}</Text> : null}
      </View>
    </View>
  );
}

/** Indicateur « Brouillon enregistré » (anti-coupure). */
export function DraftBadge({ savedAt }: { savedAt: Date | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!savedAt) return;
    const timer = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(timer);
  }, [savedAt]);
  if (!savedAt) return null;
  return <Pill tone="mint" dot label="Brouillon enregistré sur le téléphone" />;
}

const styles = StyleSheet.create({
  // Carte du web : rounded-xl, bordure 1 px, ombre légère (cardShadow).
  card: { borderWidth: 1, borderRadius: radius.xl, padding: space.md, ...cardShadow },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 0,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 0 },
  avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  empty: {
    alignItems: 'center',
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  error: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.lg },
});

// Même ordre que le web (primary, secondary, tertiary, violet, cyan, rose).
const COMMUNITY_COLORS = ['#C84B20', '#1B5E3A', '#B45309', '#7C3AED', '#0E7490', '#BE185D'];

/** Couleur stable d'un nom (communauté, projet). */
export function communityColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return COMMUNITY_COLORS[Math.abs(hash) % COMMUNITY_COLORS.length]!;
}

/** Icône ronde d'une communauté (tag) : initiale sur une couleur stable, comme sur le web. */
export function CommunityIcon({ tag, size = 24 }: { tag: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: communityColor(tag),
      }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text variant="label" style={{ color: '#FFFFFF', fontSize: Math.max(10, size * 0.45), lineHeight: size }}>
        {tag.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}