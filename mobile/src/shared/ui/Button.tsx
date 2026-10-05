import { ActivityIndicator, Pressable, type PressableProps, StyleSheet, View, type ViewStyle } from 'react-native';

import { HIT, type Palette, radius, useTheme } from '@/shared/theme';

import { Icon, type IconName, Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'tool';

function variantStyle(colors: Palette, variant: Variant, pressed: boolean) {
  switch (variant) {
    case 'primary':
      return { bg: pressed ? colors.primaryPressed : colors.primary, fg: colors.onPrimary, border: 'transparent' };
    case 'secondary':
      return { bg: colors.secondary, fg: '#FFFFFF', border: 'transparent' };
    case 'danger':
      return { bg: colors.danger, fg: '#FFFFFF', border: 'transparent' };
    case 'ghost':
      return { bg: pressed ? colors.container : colors.card, fg: colors.ink, border: colors.borderStrong };
    case 'tool':
      return { bg: colors.container, fg: colors.ink, border: colors.borderStrong };
    default:
      return { bg: pressed ? colors.containerHigh : colors.container, fg: colors.ink, border: 'transparent' };
  }
}

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: Variant;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  size?: 'md' | 'lg' | 'sm';
  full?: boolean;
  style?: ViewStyle;
}

/** Bouton : 48 px de haut minimum (cible tactile du pouce, DESIGN.md). */
export function Button({
  label,
  variant = 'primary',
  icon,
  iconRight,
  loading,
  size = 'md',
  full,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      style={({ pressed }) => {
        const v = variantStyle(colors, variant, pressed);
        return [
          styles.base,
          size === 'lg' && styles.lg,
          size === 'sm' && styles.sm,
          full && styles.full,
          { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.45 : 1 },
          style,
        ];
      }}
      {...props}
    >
      {({ pressed }) => {
        const fg = variantStyle(colors, variant, pressed).fg;
        return (
          <View style={styles.row}>
            {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
            <Text variant={size === 'lg' ? 'bodyMedium' : 'label'} style={{ color: fg }} numberOfLines={2}>
              {label}
            </Text>
            {iconRight ? <Icon name={iconRight} size={18} color={fg} /> : null}
          </View>
        );
      }}
    </Pressable>
  );
}

/**
 * Action en capsule des barres d'actions (le `pillAction` du web) : 32 px de haut, texte
 * discret ; `tinted` pose le fond gris, `active` le fond terre cuite (vote donné).
 */
export function PillAction({
  icon,
  label,
  a11y,
  onPress,
  tinted,
  active,
  filled,
  loading,
}: {
  icon: IconName;
  label?: string;
  a11y: string;
  onPress?: () => void;
  tinted?: boolean;
  active?: boolean;
  filled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const fg = active ? colors.onPrimary : colors.inkMuted;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={active === undefined ? undefined : { selected: active }}
      hitSlop={{ top: 8, bottom: 8 }}
      style={({ pressed }) => [
        styles.pillAction,
        { backgroundColor: active ? colors.primary : pressed ? colors.containerHigh : tinted ? colors.container : 'transparent' },
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : <Icon name={icon} size={18} color={fg} filled={filled} />}
      {label ? (
        <Text variant="label" style={{ color: active ? colors.onPrimary : colors.inkMuted }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Bouton icône carré de 48 px (barre d'en-tête, actions rapides). */
export function IconButton({
  icon,
  label,
  onPress,
  tone = 'ink',
  filled,
  badge,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  tone?: 'ink' | 'primary' | 'danger' | 'muted';
  filled?: boolean;
  badge?: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.icon,
        { backgroundColor: filled ? colors.primary : pressed ? colors.container : 'transparent' },
      ]}
    >
      <Icon name={icon} size={22} tone={filled ? 'onPrimary' : tone} />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.canvas }]}>
          <Text variant="monoSm" tone="onPrimary">
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: HIT,
    paddingHorizontal: 20,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lg: { minHeight: 52 },
  sm: { minHeight: 40, paddingHorizontal: 14 },
  full: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillAction: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 10, borderRadius: radius.full },
  icon: { width: HIT, height: HIT, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
