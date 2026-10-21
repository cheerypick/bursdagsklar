import { Pressable, View } from 'react-native';
import { fonts, radii, TOUCH, useColors, themedStyles } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export function CheckBox({ checked, size = 30 }: { checked: boolean; size?: number }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size / 3 }, checked && styles.boxOn]}>
      {checked ? <Icon name="check" size={size * 0.6} color={colors.onPrimary} strokeWidth={3} /> : null}
    </View>
  );
}

interface TaskRowProps {
  day: string;
  month: string;
  hot?: boolean;
  title: string;
  detail?: string;
  overdueText?: string;
  linkLabel?: string;
  onLink?: () => void;
  checked: boolean;
  onToggle?: () => void;
  milestone?: boolean;
  a11yToggle: string;
  first?: boolean;
}

/** A dated to-do: date chip, title + sub-line + optional link, and a big checkbox. */
export function TaskRow({
  day,
  month,
  hot,
  title,
  detail,
  overdueText,
  linkLabel,
  onLink,
  checked,
  onToggle,
  milestone,
  a11yToggle,
  first,
}: TaskRowProps) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={[styles.row, !first && styles.divider]}>
      <View style={[styles.date, hot && { backgroundColor: colors.blush }]}>
        <Text style={[styles.dateDay, hot && { color: colors.hot }]}>{day}</Text>
        <Text style={[styles.dateMonth, hot && { color: colors.hot }]}>{month}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, checked && styles.titleDone]}>{title}</Text>
        {overdueText ? <Text style={[styles.detail, { color: colors.hot }]}>{overdueText}</Text> : null}
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        {linkLabel && onLink ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${linkLabel}: ${title}`}
            onPress={onLink}
            style={styles.tag}
            hitSlop={8}
          >
            <Text style={styles.tagText}>{linkLabel} →</Text>
          </Pressable>
        ) : null}
      </View>
      {milestone ? null : (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={a11yToggle}
          accessibilityState={{ checked }}
          onPress={onToggle}
          style={styles.hit}
        >
          <CheckBox checked={checked} />
        </Pressable>
      )}
    </View>
  );
}

/** «Har dere dette hjemme?» toggle button. */
export function HomeToggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={[styles.home, on && styles.homeOn]}
    >
      <CheckBox checked={on} size={24} />
      <Text style={styles.homeText}>{label}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  date: { width: 58, borderRadius: radii.sm, backgroundColor: colors.sage, paddingVertical: 6, alignItems: 'center' },
  dateDay: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24, color: colors.ink },
  dateMonth: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  title: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 22, color: colors.ink },
  titleDone: { textDecorationLine: 'line-through', color: colors.muted },
  detail: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.muted, marginTop: 2 },
  tag: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: colors.sage,
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.green },
  hit: { minWidth: TOUCH, minHeight: TOUCH, alignItems: 'center', justifyContent: 'center' },
  box: { borderWidth: 2, borderColor: colors.boxBorder, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.green, borderColor: colors.green },
  home: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  homeOn: { backgroundColor: colors.sage, borderColor: colors.sage },
  homeText: { fontFamily: fonts.bodySemi, fontSize: 15, flexShrink: 1 },
}));
