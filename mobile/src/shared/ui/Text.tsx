// Feather ne sert plus qu'aux logos de marque (GitHub) absents de Lucide.
import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { type Palette, type as typeScale, type TypeVariant, useTheme } from '@/shared/theme';

import { LUCIDE } from './icons';

type Tone = 'ink' | 'muted' | 'faint' | 'primary' | 'secondary' | 'danger' | 'onPrimary' | 'tertiary';

const TONE: Record<Tone, keyof Palette> = {
  ink: 'ink',
  muted: 'inkMuted',
  faint: 'inkFaint',
  primary: 'primaryInk',
  secondary: 'secondaryInk',
  danger: 'danger',
  onPrimary: 'onPrimary',
  tertiary: 'onTertiarySoft',
};

export function Text({
  variant = 'body',
  tone = 'ink',
  center,
  style,
  ...props
}: TextProps & { variant?: TypeVariant; tone?: Tone; center?: boolean }) {
  const { colors } = useTheme();
  const textStyle: TextStyle = {
    ...typeScale[variant],
    color: colors[TONE[tone]],
    ...(center ? { textAlign: 'center' } : null),
  };
  return <RNText style={[textStyle, style]} maxFontSizeMultiplier={1.6} {...props} />;
}

type FeatherName = ComponentProps<typeof Feather>['name'];
/** Noms Feather, plus quelques icônes propres à Lucide (comme sur le web). */
export type IconName =
  | FeatherName
  | 'arrow-big-up'
  | 'badge-check'
  | 'code-xml'
  | 'folder-git'
  | 'languages'
  | 'lightbulb'
  | 'messages-square'
  | 'shield-check'
  | 'sparkles'
  | 'user-round';

/** Icônes Lucide (les mêmes que le web) ; Feather en secours pour les logos de marque. */
export function Icon({
  name,
  size = 20,
  color,
  tone = 'ink',
  filled,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  tone?: Tone;
  /** Remplit la forme (flèche de vote active). */
  filled?: boolean;
  strokeWidth?: number;
}) {
  const { colors } = useTheme();
  const tint = color ?? colors[TONE[tone]];
  const Lucide = LUCIDE[name];
  if (Lucide) return <Lucide size={size} color={tint} strokeWidth={strokeWidth} fill={filled ? tint : 'none'} />;
  return <Feather name={name as FeatherName} size={size} color={tint} />;
}
