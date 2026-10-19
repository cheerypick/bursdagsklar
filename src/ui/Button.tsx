import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { fonts, radii, TOUCH, useLayout, useColors, themedStyles } from '../theme';
import { Text } from './Text';

type Kind = 'primary' | 'light' | 'ghost' | 'onDark';

interface Props {
  label: string;
  onPress: () => void;
  kind?: Kind;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Full width on phones; on wide screens buttons size to content (min 280). */
  block?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  accessibilityLabel,
  block,
  compact,
  style,
  testID,
}: Props) {
  const styles = useStyles();
  const colors = useColors();
  const { isWide } = useLayout();
  const fullWidth = block ?? !isWide;
  const bg = kind === 'primary' ? colors.green : kind === 'light' || kind === 'onDark' ? colors.white : 'transparent';
  const fg = kind === 'primary' ? colors.onPrimary : colors.green;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.base,
        { backgroundColor: bg, minHeight: compact ? 54 : 62 },
        kind === 'light' && styles.lightRing,
        fullWidth ? styles.block : styles.auto,
        hovered && kind === 'primary' && !disabled && { backgroundColor: colors.primaryHover },
        pressed && { transform: [{ scale: 0.98 }] },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: fg, fontSize: compact ? 16 : 18 }]}>{label}</Text>
    </Pressable>
  );
}

export function Pill({
  label,
  on,
  onPress,
  accessibilityLabel,
  light,
}: {
  label: string;
  on?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  light?: boolean;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      style={[styles.pill, { backgroundColor: on ? colors.green : light ? colors.white : colors.sage }]}
    >
      <Text style={[styles.pillText, { color: on ? colors.onPrimary : colors.green }]}>{label}</Text>
    </Pressable>
  );
}

export function PillRow({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return <View style={styles.pills}>{children}</View>;
}

const useStyles = themedStyles((colors) => ({
  base: { borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  block: { alignSelf: 'stretch' },
  auto: { alignSelf: 'flex-start', minWidth: 280 },
  lightRing: { borderWidth: 1.5, borderColor: colors.line },
  label: { fontFamily: fonts.bodyBold },
  pill: {
    minHeight: TOUCH,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 15 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
}));
