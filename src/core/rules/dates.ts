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

// ---------- parsing the date field (spec §6.3) ----------

export type DateParseResult =
  { ok: true; date: ISODate } | { ok: false; reason: 'empty' | 'unparsed' | 'past' | 'too-far' };

export const MAX_DAYS_AHEAD = 365;

function monthFromWord(word: string): number | null {
  const w = word.toLowerCase().replace(/\.$/, '');
  if (w.length < 3) return null;
  for (let i = 0; i < 12; i++) {
    if (MONTHS[i] === w || MONTHS[i].startsWith(w)) return i + 1;
  }
  return null;
}

const WEEKDAY_WORDS = /\b(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag|man|tir|ons|tor|fre|lør|søn)\b\.?/giu;

/**
 * Accepts «8. november», «8 nov», «8.11», «08.11.2026», «lørdag 7. november»,
 * «7/11», and the native picker's «2026-11-07». Weekday words are ignored.
 * Without a year: the next occurrence on or after today.
 */
export function parseDateInput(input: string, today: ISODate): DateParseResult {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: 'empty' };

  let y: number | null = null;
  let m: number | null = null;
  let d: number | null = null;

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    y = +iso[1];
    m = +iso[2];
    d = +iso[3];
  } else {
    const text = raw.toLowerCase().replace(WEEKDAY_WORDS, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    const numeric = text.match(/^(\d{1,2})\s*[./-]\s*(\d{1,2})(?:\s*[./-]\s*(\d{2,4}))?\.?$/);
    const worded = text.match(/^(\d{1,2})\.?\s*([a-zæøå]+)\.?(?:\s+(\d{4}))?$/u);
    if (numeric) {
      d = +numeric[1];
      m = +numeric[2];
      if (numeric[3]) y = numeric[3].length === 2 ? 2000 + +numeric[3] : +numeric[3];
    } else if (worded) {
      d = +worded[1];
      m = monthFromWord(worded[2]);
      if (worded[3]) y = +worded[3];
    }
  }
  if (d === null || m === null) return { ok: false, reason: 'unparsed' };

  const t = parts(today);
  if (y === null) {
    if (!isValidDate(t.y, m, d) && !isValidDate(t.y + 1, m, d)) return { ok: false, reason: 'unparsed' };
    // 29 February without a year: take the next year where it exists
    let year = t.y;
    while (!isValidDate(year, m, d) || toISO(year, m, d) < today) year++;
    y = year;
  }
  if (!isValidDate(y, m, d)) return { ok: false, reason: 'unparsed' };
  const date = toISO(y, m, d);
  if (date < today) return { ok: false, reason: 'past' };
  if (diffDays(today, date) > MAX_DAYS_AHEAD) return { ok: false, reason: 'too-far' };
  return { ok: true, date };
}

export const DATE_ERRORS: Record<'empty' | 'unparsed' | 'past' | 'too-far', string> = {
  empty: 'Skriv en dato, for eksempel «8. november».',
  unparsed: 'Vi skjønte ikke datoen. Prøv for eksempel «8. november» eller «8.11».',
  past: 'Den datoen har vært. Velg en dato fram i tid.',
  'too-far': 'Det er over et år til. Velg en dato innen et år.',
};

// ---------- weekend check (spec §6.3) ----------

export interface WeekendNudge {
  /** The party date as chosen. */
  date: ISODate;
  /** The Saturday we suggest instead. */
  saturday: ISODate;
  question: string;
  yes: string;
  no: string;
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
  const dSat = parts(saturday).d;
  const head = `${formatDayMonth(date)} er en ${WEEKDAYS[wd]}.`;
  if (wd === 0) {
    return {
      date,
      saturday,
      question: `${head} Mente du lørdag ${dSat}.?`,
      yes: `Ja, lørdag ${dSat}.`,
      no: `Nei, søndag ${parts(date).d}.`,
    };
  }
  return {
    date,
    saturday,
    question: `${head} Mente du lørdag ${dSat}.?`,
    yes: `Ja, lørdag ${dSat}.`,
    no: `Nei, ${WEEKDAYS[wd]} passer`,
  };
}

/** Saturday and Sunday use the weekend time column (§6.2). */
export function isWeekend(date: ISODate): boolean {
  const wd = weekday(date);
  return wd === 0 || wd === 6;
}
