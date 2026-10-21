import { useCallback, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONTENT_MAX, NARROW_MAX, useLayout, useColors } from '../theme';
import { NavBar, type TabId } from './NavBar';

// Web: size the page to the *visible* viewport. iPhone Safari's toolbars come and go, and
// `height: 100%` can be taller than what is actually on screen, so the bottom of a page
// ended up out of reach. `100dvh` follows the toolbars; browsers without it keep 100%.
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('screen-viewport')) {
  const style = document.createElement('style');
  style.id = 'screen-viewport';
  style.textContent = '@supports (height: 100dvh) { html, body, #root { height: 100dvh; } }';
  document.head.appendChild(style);
}

interface Props {
  children: React.ReactNode;
  /** Sticky action area (the big «Neste» button). Pinned below the scrolling content on phones, inline on wide screens. */
  footer?: React.ReactNode;
  /** Shows the main navigation (bottom tabs on phones, top bar on wide screens). */
  tab?: TabId;
  /** Setup steps keep one narrow column even on desktop. */
  narrow?: boolean;
  background?: string;
  /** Removes the top safe-area padding (full-bleed hero images). */
  bleedTop?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Screen({ children, footer, tab, narrow, background, bleedTop, contentStyle, testID }: Props) {
  const colors = useColors();
  const bg = background ?? colors.bg;
  const insets = useSafeAreaInsets();
  const { isWide, isShort } = useLayout();
  const maxWidth = narrow ? NARROW_MAX : CONTENT_MAX;
  const bottomBar = tab && !isWide;
  const fixedFooter = footer && !isWide;

  // Is there more content below the visible part? Then the footer gets a soft edge, so it
  // reads as "this scrolls" instead of "this is cut off".
  const [more, setMore] = useState(false);
  const box = useRef({ y: 0, view: 0, content: 0 });
  const measure = useCallback(() => {
    const { y, view, content } = box.current;
    setMore(content - (y + view) > 4);
  }, []);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      box.current.y = e.nativeEvent.contentOffset.y;
      measure();
    },
    [measure],
  );
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      box.current.view = e.nativeEvent.layout.height;
      measure();
    },
    [measure],
  );
  const onContentSizeChange = useCallback(
    (_w: number, h: number) => {
      box.current.content = h;
      measure();
    },
    [measure],
  );

  return (
    <View testID={testID} style={[styles.root, { backgroundColor: bg }]}>
      {tab && isWide ? <NavBar active={tab} placement="top" /> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: bleedTop || (tab && isWide) ? 0 : insets.top,
            // the footer sits below the scroll area (not on top of it), so a little air is enough
            paddingBottom: (fixedFooter ? (isShort ? 0 : 24) : 40 + insets.bottom) + (bottomBar ? 80 : 0),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        onScroll={fixedFooter ? onScroll : undefined}
        onLayout={fixedFooter ? onLayout : undefined}
        onContentSizeChange={fixedFooter ? onContentSizeChange : undefined}
        scrollEventThrottle={fixedFooter ? 32 : undefined}
      >
        <View style={[{ width: '100%', maxWidth }, contentStyle]}>
          {children}
          {footer && isWide ? <View style={styles.inlineFooter}>{footer}</View> : null}
        </View>
      </ScrollView>
      {fixedFooter ? (
        // In the normal flow under the ScrollView: the scroll area ends where the footer
        // begins, so nothing can hide behind «Neste», however tall the content or the button.
        <View
          testID="screen-footer"
          style={[
            styles.footer,
            {
              backgroundColor: bg,
              paddingTop: isShort ? 8 : 16,
              paddingBottom: (isShort ? 10 : 20) + insets.bottom + (bottomBar ? 72 : 0),
            },
            more && { borderTopColor: colors.line, boxShadow: '0 -6px 14px rgba(0, 0, 0, 0.06)' },
          ]}
        >
          <View style={{ width: '100%', maxWidth }}>{footer}</View>
        </View>
      ) : null}
      {bottomBar ? <NavBar active={tab!} placement="bottom" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { alignItems: 'center', flexGrow: 1 },
  footer: {
    paddingHorizontal: 22,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  inlineFooter: { paddingHorizontal: 32, paddingTop: 28 },
});
