/**
 * Design tokens, taken from the approved prototype's CSS (spec §11).
 * Screens never use raw colours or sizes: they use these tokens through the ui/ components.
 */
import { Platform } from 'react-native';

export const colors = {
  bg: '#FBF7F1', // warm cream app background
  page: '#EFE9DF', // behind the content column on wide screens
  card: '#FFFFFF',
  ink: '#1F2A26',
  muted: '#6B7570',
  line: '#ECE6DC',
  green: '#1F3D36', // primary buttons, selected states
  green2: '#2C5348', // hover, eyebrow text
  blush: '#F7E0DF', // next-task card
  butter: '#F6EAC6', // nudges, tip boxes
  sage: '#E0EADD', // pills, date chips
  lilac: '#ECE3F5', // hints
  sky: '#DFEBF1',
  pink: '#D9607A', // focus ring, «hot» dates
  readyText: '#CFE0D9',
  white: '#FFFFFF',
  boxBorder: '#CFC7BA',
} as const;

export const radii = { lg: 28, md: 20, sm: 14, pill: 999 } as const;

/** 4-pt spacing scale; 22 is the prototype's page gutter. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 28, xxxl: 40 } as const;

/** Font family names as registered with expo-font in app/_layout.tsx. */
export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayHeavy: 'BricolageGrotesque_800ExtraBold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemi: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
} as const;

/** Type scale (px). */
export const type = {
  hero: 44,
  h1: 38,
  h1Small: 34,
  h2: 28,
  h2Small: 24,
  h3: 20,
  body: 17,
  lede: 18,
  small: 15,
  tiny: 13,
} as const;

/** Minimum touch target (accessibility). */
export const TOUCH = 48;

export const shadow = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(31,42,38,.05), 0 8px 24px rgba(31,42,38,.06)' },
  default: { boxShadow: '0 1px 2px rgba(31,42,38,0.05), 0 8px 24px rgba(31,42,38,0.06)' },
}) as object;

export const breakpoints = { wide: 768, desktop: 1024 } as const;
export const CONTENT_MAX = 1100;
/** Max width of the single phone column used by setup steps on wide screens. */
export const NARROW_MAX = 560;
