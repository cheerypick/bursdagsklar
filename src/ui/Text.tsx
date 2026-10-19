import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { fonts, type as t, themedStyles } from '../theme';

type Variant = 'hero' | 'h1' | 'h1Small' | 'h2' | 'h2Small' | 'h3' | 'body' | 'lede' | 'small' | 'eyebrow' | 'label';

const useStyles = themedStyles((colors) => ({
  hero: {
    fontFamily: fonts.display,
    fontSize: t.hero,
    lineHeight: t.hero * 1.02,
    letterSpacing: -0.9,
    color: colors.ink,
  },
  h1: { fontFamily: fonts.display, fontSize: t.h1, lineHeight: t.h1 * 1.04, letterSpacing: -0.76, color: colors.ink },
  h1Small: {
    fontFamily: fonts.display,
    fontSize: t.h1Small,
    lineHeight: t.h1Small * 1.05,
    letterSpacing: -0.68,
    color: colors.ink,
  },
  h2: { fontFamily: fonts.display, fontSize: t.h2, lineHeight: t.h2 * 1.08, letterSpacing: -0.56, color: colors.ink },
  h2Small: {
    fontFamily: fonts.display,
    fontSize: t.h2Small,
    lineHeight: t.h2Small * 1.1,
    letterSpacing: -0.48,
    color: colors.ink,
  },
  h3: { fontFamily: fonts.display, fontSize: t.h3, lineHeight: t.h3 * 1.15, letterSpacing: -0.4, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: t.body, lineHeight: t.body * 1.45, color: colors.ink },
  lede: { fontFamily: fonts.body, fontSize: t.lede, lineHeight: t.lede * 1.45, color: colors.muted },
  small: { fontFamily: fonts.body, fontSize: t.small, lineHeight: t.small * 1.4, color: colors.muted },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: t.tiny,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.green2,
  },
  label: { fontFamily: fonts.bodySemi, fontSize: t.body, lineHeight: t.body * 1.35, color: colors.ink },
}));

const headingLevel: Partial<Record<Variant, number>> = { hero: 1, h1: 1, h1Small: 1, h2: 2, h2Small: 2, h3: 3 };

export function Text({ variant = 'body', style, color, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  const styles = useStyles();
  const level = headingLevel[variant];
  const a11y = level ? ({ role: 'heading', 'aria-level': level } as unknown as TextProps) : {};
  return <RNText {...a11y} {...rest} style={[styles[variant], color ? ({ color } as TextStyle) : null, style]} />;
}
