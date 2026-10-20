/**
 * Pure logic for our own month calendar (src/ui/Calendar.tsx): the grid, Monday first,
 * Norwegian names, which days can be picked, and keyboard movement. No Date objects
 * in local time, so no timezone or DST can move a day.
 */
import type { ISODate } from '../model';
import { addDays, capitalize, MONTHS, parts, toISO, weekday, WEEKDAYS } from './dates';

/** Column headers, Monday first. */
export const WEEKDAY_HEADERS = ['ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø'] as const;
/** Full names for screen readers, same order as the headers. */
export const WEEKDAY_NAMES_MONDAY_FIRST = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag'];

/** A month: `m` is 1–12. */
export interface YearMonth {
  y: number;
  m: number;
}

export interface DayCell {
  iso: ISODate;
  day: number;
  /** Before `min` (in the past) or after `max` (more than a year ahead). */
  disabled: boolean;
  isToday: boolean;
  /** «onsdag 11. november 2026», for accessibility labels. */
  label: string;
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

/** 0 = Monday … 6 = Sunday. */
export function mondayIndex(iso: ISODate): number {
  return (weekday(iso) + 6) % 7;
}

export function monthOf(iso: ISODate): YearMonth {
  const { y, m } = parts(iso);
  return { y, m };
}

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  const n = ym.y * 12 + (ym.m - 1) + delta;
  return { y: Math.floor(n / 12), m: (n % 12) + 1 };
}

/** −1, 0 or 1. */
export function compareMonths(a: YearMonth, b: YearMonth): number {
  const d = a.y * 12 + a.m - (b.y * 12 + b.m);
  return d === 0 ? 0 : d < 0 ? -1 : 1;
}

/** «Oktober 2026» */
export function monthTitle(ym: YearMonth): string {
  return `${capitalize(MONTHS[ym.m - 1])} ${ym.y}`;
}

/** «onsdag 11. november 2026» */
export function dayLabel(iso: ISODate): string {
  const { y, m, d } = parts(iso);
  return `${WEEKDAYS[weekday(iso)]} ${d}. ${MONTHS[m - 1]} ${y}`;
}

export function isSelectable(iso: ISODate, min: ISODate, max: ISODate): boolean {
  return iso >= min && iso <= max;
}

/**
 * The month as weeks of 7 cells, Monday first. Days of other months are `null`
 * (blank), so a month has 4–6 rows.
 */
export function monthGrid(ym: YearMonth, opts: { min: ISODate; max: ISODate; today: ISODate }): (DayCell | null)[][] {
  const first = toISO(ym.y, ym.m, 1);
  const lead = mondayIndex(first);
  const n = daysInMonth(ym.y, ym.m);
  const cells: (DayCell | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= n; d++) {
    const iso = toISO(ym.y, ym.m, d);
    cells.push({
      iso,
      day: d,
      disabled: !isSelectable(iso, opts.min, opts.max),
      isToday: iso === opts.today,
      label: dayLabel(iso),
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (DayCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Can the arrows move to the previous / next month without leaving [min, max]? */
export function canGoMonth(ym: YearMonth, delta: -1 | 1, min: ISODate, max: ISODate): boolean {
  const target = addMonths(ym, delta);
  return delta < 0 ? compareMonths(target, monthOf(min)) >= 0 : compareMonths(target, monthOf(max)) <= 0;
}

/** The same day number in another month, clamped to that month's length («31. jan» + 1 → «28./29. feb»). */
export function shiftMonth(iso: ISODate, delta: number): ISODate {
  const { d } = parts(iso);
  const t = addMonths(monthOf(iso), delta);
  return toISO(t.y, t.m, Math.min(d, daysInMonth(t.y, t.m)));
}

export type CalendarKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'PageUp' | 'PageDown' | 'Home' | 'End';

/**
 * Keyboard movement in the grid (the WAI-ARIA date-picker pattern): arrows by day/week,
 * Page Up/Down by month, Home/End to the start/end of the week. Never leaves [min, max].
 */
export function moveFocus(iso: ISODate, key: string, min: ISODate, max: ISODate): ISODate | null {
  let next: ISODate;
  switch (key) {
    case 'ArrowLeft':
      next = addDays(iso, -1);
      break;
    case 'ArrowRight':
      next = addDays(iso, 1);
      break;
    case 'ArrowUp':
      next = addDays(iso, -7);
      break;
    case 'ArrowDown':
      next = addDays(iso, 7);
      break;
    case 'PageUp':
      next = shiftMonth(iso, -1);
      break;
    case 'PageDown':
      next = shiftMonth(iso, 1);
      break;
    case 'Home':
      next = addDays(iso, -mondayIndex(iso));
      break;
    case 'End':
      next = addDays(iso, 6 - mondayIndex(iso));
      break;
    default:
      return null;
  }
  if (next < min) return min;
  if (next > max) return max;
  return next;
}
