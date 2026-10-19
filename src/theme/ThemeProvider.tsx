/**
 * App-wide theming. Before a theme is chosen the app uses the neutral brand palette; once a theme
 * is picked (in setup, or on the saved party) every screen and component is painted in that theme's
 * palette from core/themes.ts. Components read colours with `useColors()` or build style sheets
 * with `themedStyles()`, never from the static brand `colors`.
 */
import { createContext, useContext, useEffect, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { BRAND_PALETTE, paletteFor, themeById, type Theme, type ThemeId, type ThemePalette } from '../core';
import { colors as brandColors } from './tokens';

export type Colors = Omit<typeof brandColors, 'bg' | 'green' | 'green2' | 'sage' | 'blush' | 'readyText'> &
  ThemePalette & {
    /** = primary (kept so existing components read naturally) */
    green: string;
    /** = accent */
    green2: string;
    /** = soft */
    sage: string;
    /** = cardTint */
    blush: string;
    /** = onPrimarySoft */
    readyText: string;
  };

const cache = new Map<ThemePalette, Colors>();

/** The full colour set for a palette (stable object per palette, so style caches can key on it). */
export function colorsFor(p: ThemePalette): Colors {
  let c = cache.get(p);
  if (!c) {
    c = {
      ...brandColors,
      ...p,
      green: p.primary,
      green2: p.accent,
      sage: p.soft,
      blush: p.cardTint,
      readyText: p.onPrimarySoft,
    };
    cache.set(p, c);
  }
  return c;
}

interface ThemeState {
  /** The chosen theme, or null before one is chosen (brand look). */
  theme: Theme | null;
  palette: ThemePalette;
  colors: Colors;
}

const BRAND_STATE: ThemeState = { theme: null, palette: BRAND_PALETTE, colors: colorsFor(BRAND_PALETTE) };
const Ctx = createContext<ThemeState>(BRAND_STATE);

export function ThemeProvider({ themeId, children }: { themeId: ThemeId | null; children: React.ReactNode }) {
  const value = useMemo<ThemeState>(() => {
    if (!themeId) return BRAND_STATE;
    const palette = paletteFor(themeId);
    return { theme: themeById(themeId), palette, colors: colorsFor(palette) };
  }, [themeId]);

  // Web: tint the page behind the app too (overscroll, the area around the column) and the browser bar.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = value.palette.bg;
    document.body.style.backgroundColor = value.palette.bg;
    document.documentElement.dataset.theme = value.theme?.id ?? 'brand';
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', value.palette.bg);
  }, [value]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppTheme(): ThemeState {
  return useContext(Ctx);
}

export function useColors(): Colors {
  return useContext(Ctx).colors;
}

/**
 * A StyleSheet that follows the theme. Write `const useStyles = themedStyles((colors) => ({ … }))`
 * at module level and call `const styles = useStyles()` in the component. One sheet per palette, cached.
 */
type StyleInput = Parameters<typeof StyleSheet.create>[0];

export function themedStyles<S extends StyleInput>(factory: (colors: Colors) => S): () => Readonly<S> {
  const sheets = new WeakMap<Colors, Readonly<S>>();
  return function useStyles() {
    const c = useColors();
    const hit = sheets.get(c);
    if (hit) return hit;
    const made = StyleSheet.create(factory(c)) as Readonly<S>;
    sheets.set(c, made);
    return made;
  };
}
