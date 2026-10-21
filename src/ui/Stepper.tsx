import { Pressable, View } from 'react-native';
import { fonts, radii, shadow, useColors, themedStyles } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export function Stepper({
  value,
  min,
  max,
  unit,
  onChange,
  lessLabel,
  moreLabel,
  compact,
  testID,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
  lessLabel: string;
  moreLabel: string;
  /** Smaller, for two steppers side by side (Mat: barn / voksne). */
  compact?: boolean;
  /** Sets `<id>`, `<id>-less`, `<id>-more` and `<id>-value`. */
  testID?: string;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]} testID={testID}>
      <Pressable
        testID={testID && `${testID}-less`}
        accessibilityRole="button"
        accessibilityLabel={lessLabel}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={[styles.btn, compact && styles.btnCompact, value <= min && { opacity: 0.4 }]}
      >
        <Icon name="minus" size={compact ? 22 : 28} color={colors.green} strokeWidth={2.4} />
      </Pressable>
      <View
        accessibilityLiveRegion="polite"
        accessible
        accessibilityLabel={`${value} ${unit}`}
        style={{ alignItems: 'center' }}
      >
        <Text style={[styles.value, compact && styles.valueCompact]} testID={testID && `${testID}-value`}>
          {value}
        </Text>
        <Text variant="small">{unit}</Text>
      </View>
      <Pressable
        testID={testID && `${testID}-more`}
        accessibilityRole="button"
        accessibilityLabel={moreLabel}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
        style={[styles.btn, compact && styles.btnCompact, value >= max && { opacity: 0.4 }]}
      >
        <Icon name="plus" size={compact ? 22 : 28} color={colors.green} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 18,
    ...shadow,
  },
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontFamily: fonts.displayHeavy, fontSize: 64, lineHeight: 68, color: colors.ink },
  wrapCompact: { padding: 12, borderRadius: radii.md, gap: 6 },
  btnCompact: { width: 48, height: 48, borderRadius: 24 },
  valueCompact: { fontSize: 36, lineHeight: 40 },
}));
