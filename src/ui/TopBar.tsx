import { Pressable, View } from 'react-native';
import { shadow, TOUCH, useColors, useLayout, themedStyles } from '../theme';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

export function BackButton({ onPress, label }: { onPress: () => void; label?: string }) {
  const { t } = useTranslation();
  label ??= t('common.back');
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.icon} hitSlop={6}>
      <Icon name="back" size={22} color={colors.ink} />
    </Pressable>
  );
}

/** Back button + «Steg n av 5» progress dashes (setup). */
export function TopBar({ onBack, step, of }: { onBack?: () => void; step?: number; of?: number }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  const { isShort } = useLayout();
  return (
    <View style={[styles.bar, isShort && styles.barShort]}>
      {onBack ? <BackButton onPress={onBack} /> : <View style={{ width: TOUCH }} />}
      {step && of ? (
        <View style={styles.progress} accessible accessibilityLabel={t('common.step', { n: step, of })}>
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

const useStyles = themedStyles((colors) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    minHeight: 64,
  },
  barShort: { paddingTop: 4, minHeight: 50 },
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
}));
