import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, CONTENT_MAX, NARROW_MAX, useLayout } from '../theme';
import { NavBar, type TabId } from './NavBar';

interface Props {
  children: React.ReactNode;
  /** Sticky action area (the big «Neste» button). Fixed at the bottom on phones, inline on wide screens. */
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

export function Screen({
  children,
  footer,
  tab,
  narrow,
  background = colors.bg,
  bleedTop,
  contentStyle,
  testID,
}: Props) {
  const insets = useSafeAreaInsets();
  const { isWide } = useLayout();
  const maxWidth = narrow ? NARROW_MAX : CONTENT_MAX;
  const bottomBar = tab && !isWide;
  const fixedFooter = footer && !isWide;
  return (
    <View testID={testID} style={[styles.root, { backgroundColor: background }]}>
      {tab && isWide ? <NavBar active={tab} placement="top" /> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: bleedTop || (tab && isWide) ? 0 : insets.top,
            paddingBottom: (fixedFooter ? 120 : 40) + (bottomBar ? 80 : 0) + insets.bottom,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[{ width: '100%', maxWidth }, contentStyle]}>
          {children}
          {footer && isWide ? <View style={styles.inlineFooter}>{footer}</View> : null}
        </View>
      </ScrollView>
      {fixedFooter ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: background, paddingBottom: 20 + insets.bottom + (bottomBar ? 72 : 0) },
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  inlineFooter: { paddingHorizontal: 32, paddingTop: 28 },
});
