import { useEffect, useId, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, View } from 'react-native';
import {
  addMonths,
  canGoMonth,
  compareMonths,
  monthGrid,
  monthOf,
  monthTitle,
  moveFocus,
  WEEKDAY_HEADERS,
  WEEKDAY_NAMES_MONDAY_FIRST,
  type ISODate,
  type YearMonth,
} from '../core';
import { fonts, radii, themedStyles, useColors, useLayout } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

interface Props {
  value: ISODate | null;
  /** First pickable day (today). */
  min: ISODate;
  /** Last pickable day (a year ahead). */
  max: ISODate;
  today: ISODate;
  onChange: (date: ISODate) => void;
  testID?: string;
}

/**
 * Our own month calendar, the same on iPhone, Android and the web: Norwegian, Monday first,
 * big round day cells (≥ 44 pt), today with a soft ring, the chosen day filled in the primary
 * colour, past days faded and disabled. On the web the arrow keys move between days
 * (Page Up/Down by month, Home/End within the week) and Enter/Space picks.
 * The grid itself is pure logic in core/rules/calendar.ts.
 */
export function Calendar({ value, min, max, today, onChange, testID }: Props) {
  const styles = useStyles();
  const colors = useColors();
  // short phone screens: slightly smaller rows (still ≥ 44 pt to tap), so all six weeks fit above «Neste»
  const { isShort } = useLayout();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [month, setMonth] = useState<YearMonth>(() => monthOf(value ?? min));
  // the one day that is in the tab order (roving tabindex)
  const [focusDay, setFocusDay] = useState<ISODate>(value ?? (today >= min ? today : min));
  const keyNav = useRef(false);
  const gridRef = useRef<ComponentRef<typeof View>>(null);

  const weeks = useMemo(() => monthGrid(month, { min, max, today }), [month, min, max, today]);
  const focusInMonth = compareMonths(monthOf(focusDay), month) === 0;
  const firstEnabled = weeks.flat().find((c) => c && !c.disabled)?.iso;
  const tabbable = focusInMonth ? focusDay : firstEnabled;

  const cellId = (iso: ISODate) => `cal-${uid}-${iso}`;

  // after a key press, move real focus to the new day (web)
  useEffect(() => {
    if (Platform.OS !== 'web' || !keyNav.current || typeof document === 'undefined') return;
    keyNav.current = false;
    document.getElementById(cellId(focusDay))?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDay, month]);

  // keyboard arrows on the web (a native keydown listener on the grid element)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = gridRef.current as unknown as HTMLElement | null;
    if (!el || typeof el.addEventListener !== 'function') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const iso = target?.id?.startsWith(`cal-${uid}-`) ? target.id.slice(`cal-${uid}-`.length) : null;
      if (!iso) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (iso >= min && iso <= max) onChange(iso);
        return;
      }
      const next = moveFocus(iso, e.key, min, max);
      if (!next) return;
      e.preventDefault();
      keyNav.current = true;
      setFocusDay(next);
      setMonth(monthOf(next));
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [uid, min, max, onChange]);

  const go = (delta: -1 | 1) => {
    if (!canGoMonth(month, delta, min, max)) return;
    setMonth(addMonths(month, delta));
  };
  const prevOk = canGoMonth(month, -1, min, max);
  const nextOk = canGoMonth(month, 1, min, max);
  const title = monthTitle(month);

  return (
    <View style={[styles.wrap, isShort && styles.wrapShort]} testID={testID}>
      <View style={[styles.head, isShort && styles.headShort]}>
        <Pressable
          testID="calendar-prev"
          accessibilityRole="button"
          accessibilityLabel={`Forrige måned, ${monthTitle(addMonths(month, -1))}`}
          accessibilityState={{ disabled: !prevOk }}
          disabled={!prevOk}
          onPress={() => go(-1)}
          style={({ pressed }) => [
            styles.arrow,
            isShort && styles.arrowShort,
            !prevOk && styles.arrowOff,
            pressed && styles.arrowPressed,
          ]}
        >
          <Icon name="back" size={26} strokeWidth={2.6} color={colors.green} />
        </Pressable>
        <Text testID="calendar-month" style={styles.title} accessibilityRole="header" accessibilityLiveRegion="polite">
          {title}
        </Text>
        <Pressable
          testID="calendar-next"
          accessibilityRole="button"
          accessibilityLabel={`Neste måned, ${monthTitle(addMonths(month, 1))}`}
          accessibilityState={{ disabled: !nextOk }}
          disabled={!nextOk}
          onPress={() => go(1)}
          style={({ pressed }) => [
            styles.arrow,
            isShort && styles.arrowShort,
            !nextOk && styles.arrowOff,
            pressed && styles.arrowPressed,
          ]}
        >
          <Icon name="forward" size={26} strokeWidth={2.6} color={colors.green} />
        </Pressable>
      </View>

      <View style={styles.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {WEEKDAY_HEADERS.map((d, i) => (
          <View key={d} style={[styles.cell, styles.weekdayCell]}>
            <Text style={styles.weekday} accessibilityLabel={WEEKDAY_NAMES_MONDAY_FIRST[i]}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      <View ref={gridRef} accessibilityLabel={`Kalender, ${title}`} role="group" testID="calendar-grid">
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.row}>
            {week.map((c, ci) => {
              if (!c) return <View key={`e${ci}`} style={[styles.cell, isShort && styles.cellShort]} />;
              const selected = c.iso === value;
              return (
                <View key={c.iso} style={[styles.cell, isShort && styles.cellShort]}>
                  <Pressable
                    nativeID={cellId(c.iso)}
                    testID={`day-${c.iso}`}
                    accessibilityRole="button"
                    accessibilityLabel={c.isToday ? `${c.label}, i dag` : c.label}
                    accessibilityState={{ selected, disabled: c.disabled }}
                    aria-current={c.isToday ? 'date' : undefined}
                    aria-pressed={selected}
                    disabled={c.disabled}
                    focusable={!c.disabled && c.iso === tabbable}
                    onFocus={() => c.iso !== focusDay && setFocusDay(c.iso)}
                    onPress={() => {
                      setFocusDay(c.iso);
                      onChange(c.iso);
                    }}
                    style={({
                      pressed,
                      hovered,
                      focused,
                    }: {
                      pressed: boolean;
                      hovered?: boolean;
                      focused?: boolean;
                    }) => [
                      styles.day,
                      isShort && styles.dayShort,
                      c.isToday && !selected && styles.today,
                      (hovered || pressed) && !selected && !c.disabled && styles.dayHover,
                      selected && styles.selected,
                      focused && !selected && styles.focused,
                      c.disabled && styles.disabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        c.isToday && styles.todayText,
                        selected && { color: colors.onPrimary, fontFamily: fonts.bodyBold },
                      ]}
                    >
                      {c.day}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const CELL = 46;
/** Short phone screens: still at least the 44 pt touch target. */
const CELL_SHORT = 44;

const useStyles = themedStyles((colors) => ({
  wrap: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 14,
    borderWidth: 2,
    borderColor: colors.line,
  },
  wrapShort: { paddingTop: 8, paddingBottom: 8 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  headShort: { marginBottom: 0 },
  arrow: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowShort: { width: 44, height: 44, borderRadius: 22 },
  arrowPressed: { opacity: 0.75 },
  arrowOff: { opacity: 0.3 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.ink, textAlign: 'center', flex: 1 },
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: CELL + 4, paddingVertical: 2 },
  cellShort: { minHeight: CELL_SHORT, paddingVertical: 0 },
  weekdayCell: { minHeight: 26 },
  weekday: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  day: {
    width: CELL,
    height: CELL,
    borderRadius: CELL / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    outlineStyle: 'none',
  } as object,
  dayShort: { width: CELL_SHORT, height: CELL_SHORT, borderRadius: CELL_SHORT / 2 },
  dayHover: { backgroundColor: colors.sage },
  today: { borderColor: colors.boxBorder },
  todayText: { fontFamily: fonts.bodyBold },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  focused: { boxShadow: `0 0 0 3px ${colors.pink}` } as object,
  disabled: { opacity: 0.32 },
  dayText: { fontFamily: fonts.bodySemi, fontSize: 18, lineHeight: 22, color: colors.ink },
}));
