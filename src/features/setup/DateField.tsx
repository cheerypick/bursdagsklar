import { View } from 'react-native';
import { Icon, Text } from '../../ui';
import { fonts, radii, useColors, useLayout, themedStyles } from '../../theme';
import { formatLongCap, type ISODate } from '../../core';

/** The big card both pickers show: «Lørdag 7. november», or the placeholder. */
export function DateField({
  value,
  placeholder,
  active,
}: {
  value: ISODate | null;
  placeholder: string;
  active?: boolean;
}) {
  const styles = useStyles();
  const colors = useColors();
  // short phone screens: one slimmer line, so the whole calendar fits under it
  const { isShort } = useLayout();
  return (
    <View
      style={[styles.card, isShort && styles.cardShort, value ? styles.chosen : null, active ? styles.active : null]}
    >
      <View style={[styles.badge, isShort && styles.badgeShort]}>
        <Icon name="calendar" size={isShort ? 22 : 26} color={colors.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          testID="date-result"
          style={[styles.value, !value && styles.placeholder, isShort && styles.valueShort]}
          numberOfLines={2}
        >
          {value ? formatLongCap(value) : placeholder}
        </Text>
      </View>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  card: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
  },
  cardShort: { minHeight: 0, paddingVertical: 8, paddingHorizontal: 14, gap: 12 },
  chosen: { borderColor: colors.green },
  active: { borderColor: colors.pink },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeShort: { width: 40, height: 40, borderRadius: 20 },
  value: { fontFamily: fonts.display, fontSize: 26, lineHeight: 31, color: colors.ink },
  placeholder: { fontFamily: fonts.displaySemi, fontSize: 22, lineHeight: 28, color: colors.muted },
  valueShort: { fontSize: 21, lineHeight: 26 },
}));
