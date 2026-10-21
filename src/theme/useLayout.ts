import { useWindowDimensions } from 'react-native';
import { breakpoints, CONTENT_MAX, space } from './tokens';

export interface Layout {
  width: number;
  /** ≥ 768 px: top navigation, multi-column grids, buttons not full width. */
  isWide: boolean;
  /** ≥ 1024 px */
  isDesktop: boolean;
  gutter: number;
  contentMax: number;
  /** Columns for photo-card grids (themes, plan cards). */
  gridColumns: number;
}

export function useLayout(): Layout {
  const { width } = useWindowDimensions();
  const isWide = width >= breakpoints.wide;
  const isDesktop = width >= breakpoints.desktop;
  return {
    width,
    isWide,
    isDesktop,
    gutter: isWide ? 32 : space.xl,
    contentMax: CONTENT_MAX,
    gridColumns: isDesktop ? 3 : isWide ? 3 : 2,
  };
}
