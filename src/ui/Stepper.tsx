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
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
  lessLabel: string;
  moreLabel: string;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={lessLabel}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={[styles.btn, value <= min && { opacity: 0.4 }]}
      >
        <Icon name="minus" size={28} color={colors.green} strokeWidth={2.4} />
      </Pressable>
      <View
        accessibilityLiveRegion="polite"
        accessible
        accessibilityLabel={`${value} ${unit}`}
        style={{ alignItems: 'center' }}
      >
        <Text style={styles.value}>{value}</Text>
        <Text variant="small">{unit}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={moreLabel}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
        style={[styles.btn, value >= max && { opacity: 0.4 }]}
      >
        <Icon name="plus" size={28} color={colors.green} strokeWidth={2.4} />
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
}));
