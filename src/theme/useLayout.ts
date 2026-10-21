import { useWindowDimensions } from 'react-native';
import { breakpoints, CONTENT_MAX, space } from './tokens';

export interface Layout {
  width: number;
  height: number;
  /** ≥ 768 px: top navigation, multi-column grids, buttons not full width. */
  isWide: boolean;
  /** ≥ 1024 px */
  isDesktop: boolean;
  /**
   * A short phone screen (< 860 px tall, e.g. iPhone Safari with its toolbars showing):
   * setup steps tighten their spacing so the question, the input and «Neste» fit on one screen.
   */
  isShort: boolean;
  gutter: number;
  contentMax: number;
  /** Columns for photo-card grids (themes, plan cards). */
  gridColumns: number;
}

const SHORT_MAX = 860;

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const isWide = width >= breakpoints.wide;
  const isDesktop = width >= breakpoints.desktop;
  return {
    width,
    height,
    isWide,
    isDesktop,
    isShort: !isWide && height < SHORT_MAX,
    gutter: isWide ? 32 : space.xl,
    contentMax: CONTENT_MAX,
    gridColumns: isDesktop ? 3 : isWide ? 3 : 2,
  };
}
