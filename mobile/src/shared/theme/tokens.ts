/** Jetons du design mobile « Warm Tech Mutualism » (maquette Stitch, DESIGN.md). */
import { Platform, type TextStyle } from 'react-native';

export const light = {
  // Fond gris chaud + cartes blanches : les blocs se détachent (même système que le web).
  canvas: '#F3F1ED',
  card: '#FFFFFF',
  container: '#F0EDE9',
  containerHigh: '#E7E3DE',
  border: '#E5E1DB',
  borderStrong: '#CFC8BF',
  ink: '#191817',
  inkMuted: '#5D5650',
  inkFaint: '#8E8780',

  // Valeurs identiques à web/src/styles/globals.css.
  primary: '#C84B20', // terre cuite
  primaryPressed: '#B44018',
  primaryInk: '#A63306',
  primarySoft: '#FFDBD0',
  onPrimary: '#FFFFFF',

  secondary: '#1B5E3A', // émeraude
  secondaryHover: '#14462B',
  secondaryInk: '#1B5E3A',
  secondarySoft: '#D8F5E2',
  secondaryMint: '#D8F5E2',

  tertiary: '#B45309', // ocre
  tertiarySoft: '#FFE7D6',
  onTertiarySoft: '#763300',

  danger: '#BA1A1A',
  dangerSoft: '#FFDAD6',
  onDangerSoft: '#93000A',

  codeBg: '#1F1E1C',
  codeLine: '#2C2A27',
  codeInk: '#EBE7E2',
  codeFaint: '#8E8984',
  scrim: 'rgba(26, 25, 24, 0.45)',
};

export type Palette = typeof light;

export const dark: Palette = {
  canvas: '#0B0E10',
  card: '#15191C',
  container: '#20262A',
  containerHigh: '#283035',
  border: '#262D32',
  borderStrong: '#39434A',
  ink: '#EEF0F1',
  inkMuted: '#B0B8BD',
  inkFaint: '#7F8A91',

  primary: '#C84B20',
  primaryPressed: '#D9592B',
  primaryInk: '#FF9A78',
  primarySoft: '#3A1A10',
  onPrimary: '#FFFFFF',

  secondary: '#23774A',
  secondaryHover: '#2B8A57',
  secondaryInk: '#7FD4A8',
  secondarySoft: '#12301F',
  secondaryMint: '#12301F',

  tertiary: '#D97706',
  tertiarySoft: '#3A2412',
  onTertiarySoft: '#FFB68E',

  danger: '#FF6B5E',
  dangerSoft: '#3B1414',
  onDangerSoft: '#FFB4AB',

  codeBg: '#0B0F11',
  codeLine: '#1B2226',
  codeInk: '#F2EDE8',
  codeFaint: '#8E8680',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoRegular: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_600SemiBold',
} as const;

/**
 * Échelle typographique (corps jamais sous 16 px : lisible en plein soleil).
 * Une seule famille (Plus Jakarta Sans) : `mono` / `monoSm` servent aux méta-informations
 * (dates, compteurs, tags) en sans-serif ; le monospace est réservé au code (`code`).
 */
export const type = {
  headlineXl: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  headlineLg: { fontFamily: fonts.bold, fontSize: 21, lineHeight: 27, letterSpacing: -0.3 },
  headlineMd: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, letterSpacing: -0.1 },
  bodyLg: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 25 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyMedium: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  mono: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  monoSm: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  code: { fontFamily: fonts.monoRegular, fontSize: 13, lineHeight: 20 },
} as const;

export type TypeVariant = keyof typeof type;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, gutter: 16, margin: 20 } as const;

export const radius = { sm: 4, md: 8, lg: 12, xl: 16, sheet: 24, full: 9999 } as const;

/** Ombre des cartes du web (`shadow-card` : 0 1px 2px rgba(25,24,23,0.05)). */
export const cardShadow = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(25, 24, 23, 0.05)' },
  default: { shadowColor: '#191817', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
}) as object;

/**
 * Cible web d'Expo seulement : retire le contour navigateur des champs, dont le cadre
 * indique déjà le focus. Sans effet sur iOS et Android.
 */
export const noFocusRing = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

/** Cible tactile minimale (DESIGN.md) : 48 x 48. */
export const HIT = 48;
