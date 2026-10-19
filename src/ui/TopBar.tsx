import { Pressable, StyleSheet, View } from 'react-native';
import { colors, shadow, TOUCH } from '../theme';
import { nb } from '../i18n/nb';
import { Icon } from './Icon';

export function BackButton({ onPress, label = nb.common.back }: { onPress: () => void; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.icon} hitSlop={6}>
      <Icon name="back" size={22} color={colors.ink} />
    </Pressable>
  );
}

/** Back button + «Steg n av 5» progress dashes (setup). */
export function TopBar({ onBack, step, of }: { onBack?: () => void; step?: number; of?: number }) {
  return (
    <View style={styles.bar}>
      {onBack ? <BackButton onPress={onBack} /> : <View style={{ width: TOUCH }} />}
      {step && of ? (
        <View style={styles.progress} accessible accessibilityLabel={nb.common.step(step, of)}>
          {Array.from({ length: of }).map((_, i) => (
            <View key={i} style={[styles.dash, i < step && { backgroundColor: colors.green }]} />
          ))}
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={{ width: TOUCH }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    minHeight: 64,
  },
  icon: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: TOUCH / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  progress: { flex: 1, flexDirection: 'row', gap: 6, marginHorizontal: 14 },
  dash: { flex: 1, height: 6, borderRadius: 6, backgroundColor: colors.line },
});
