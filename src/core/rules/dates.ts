import type { HHMM, ISODate } from '../model';

/*
 * Pure calendar arithmetic on 'YYYY-MM-DD' strings.
 * Day numbers are computed in UTC so no timezone or DST can shift a date.
 * "Today" is the calendar date in Europe/Oslo (spec §6.3).
 */

const DAY_MS = 86_400_000;

export const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
export const WEEKDAYS_SHORT = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør'];
export const MONTHS = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
];
export const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

export function parts(iso: ISODate): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

export function toISO(y: number, m: number, d: number): ISODate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function dayNumber(iso: ISODate): number {
  const { y, m, d } = parts(iso);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromDayNumber(n: number): ISODate {
  const dt = new Date(n * DAY_MS);
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromDayNumber(dayNumber(iso) + days);
}

/** b − a in whole days. */
export function diffDays(a: ISODate, b: ISODate): number {
  return dayNumber(b) - dayNumber(a);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(iso: ISODate): number {
  return new Date(dayNumber(iso) * DAY_MS).getUTCDay();
}

export function isValidDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Today's calendar date in Europe/Oslo.
 * Built from formatToParts, never from a locale's formatted string: WebKit/Safari
 * formats 'en-CA' as «10/19/2026», not «2026-10-19», which broke every date parse.
 */
export function todayOslo(now: Date = new Date()): ISODate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const y = get('year');
  const m = get('month');
  const day = get('day');
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** ISO week: Monday of the week containing iso. */
export function mondayOf(iso: ISODate): ISODate {
  const wd = weekday(iso);
  return addDays(iso, -((wd + 6) % 7));
}

// ---------- formatting (nb-NO) ----------

/** «lørdag 7. november» */
export function formatLong(iso: ISODate): string {
  const { m, d } = parts(iso);
  return `${WEEKDAYS[weekday(iso)]} ${d}. ${MONTHS[m - 1]}`;
}

/** «Lørdag 7. november» */
export function formatLongCap(iso: ISODate): string {
  return capitalize(formatLong(iso));
}

/** «7. november» */
export function formatDayMonth(iso: ISODate): string {
  const { m, d } = parts(iso);
  return `${d}. ${MONTHS[m - 1]}`;
}

/** «31. okt.» */
export function formatDayMonthShort(iso: ISODate): string {
  const { m, d } = parts(iso);
  return `${d}. ${MONTHS_SHORT[m - 1]}.`;
}

/** «lør 7. nov» */
export function formatShort(iso: ISODate): string {
  const { m, d } = parts(iso);
  return `${WEEKDAYS_SHORT[weekday(iso)]} ${d}. ${MONTHS_SHORT[m - 1]}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- times ----------

export function minutesOf(t: HHMM): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(min: number): HHMM {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** «12.00» */
export function formatClock(t: HHMM): string {
  const [h, m] = t.split(':');
  return `${Number(h)}.${m}`;
}

/** «12.00–14.00» (chips and programme) */
export function formatRange(start: HHMM, end: HHMM): string {
  return `${formatClock(start)}–${formatClock(end)}`;
}

/** «12–14», or «12.30–14.30» if either has minutes (invitations and headers) */
export function formatRangeCompact(start: HHMM, end: HHMM): string {
  const whole = start.endsWith(':00') && end.endsWith(':00');
  if (whole) return `${Number(start.slice(0, 2))}–${Number(end.slice(0, 2))}`;
  return formatRange(start, end);
}

// ---------- the date picker's bounds and shortcuts (spec §6.3) ----------

/** How far ahead a party can be planned. */
export const MAX_DAYS_AHEAD = 365;

/** The picker's range: today up to one year ahead. */
export function dateBounds(today: ISODate): { min: ISODate; max: ISODate } {
  return { min: today, max: addDays(today, MAX_DAYS_AHEAD) };
}

/** A picked value inside the range, or null (empty, malformed or out of range). */
export function pickedDate(value: string, today: ISODate): ISODate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!isValidDate(y, mo, d)) return null;
  const iso = toISO(y, mo, d);
  const { min, max } = dateBounds(today);
  return iso < min || iso > max ? null : iso;
}

/** The next `count` Saturdays from today (today included when it is a Saturday). */
export function nextSaturdays(today: ISODate, count = 3): ISODate[] {
  const first = addDays(today, (6 - weekday(today) + 7) % 7);
  return Array.from({ length: count }, (_, i) => addDays(first, 7 * i));
}

// ---------- weekend check (spec §6.3) ----------

export interface WeekendNudge {
  /** The party date as chosen. */
  date: ISODate;
  /** The Saturday we suggest instead. */
  saturday: ISODate;
  /** Gentle hint shown after picking, e.g. «Det er en søndag – passer det? Lørdag 7.?» */
  question: string;
  /** The one-tap switch. */
  yes: string;
}

/**
 * Saturday: null (no nudge). Sunday: suggest the day before.
 * Monday–Wednesday: the previous Saturday. Thursday–Friday: the next Saturday.
 * A suggested Saturday that is already past falls back to the next Saturday.
 */
export function weekendNudge(date: ISODate, today: ISODate): WeekendNudge | null {
  const wd = weekday(date);
  if (wd === 6) return null;
  let saturday: ISODate;
  if (wd === 0) saturday = addDays(date, -1);
  else if (wd <= 3) saturday = addDays(date, -(wd + 1));
  else saturday = addDays(date, 6 - wd);
  if (saturday < today) saturday = addDays(date, 6 - wd);
  if (saturday < today) return null;
  // «Lørdag 7.» in the same month; «Lørdag 31. oktober» across a month change
  const sat = parts(saturday).m === parts(date).m ? `${parts(saturday).d}.` : formatDayMonth(saturday);
  return {
    date,
    saturday,
    question: `Det er en ${WEEKDAYS[wd]} – passer det? Lørdag ${sat}?`,
    yes: `Bytt til lørdag ${sat}`,
  };
}

/** Saturday and Sunday use the weekend time column (§6.2). */
export function isWeekend(date: ISODate): boolean {
  const wd = weekday(date);
  return wd === 0 || wd === 6;
}
