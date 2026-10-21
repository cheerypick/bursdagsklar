import type { HHMM, ISODate } from '../model';
import { SHORT_NOTICE_DAYS } from './constants';
import { diffDays, minutesOf } from './dates';

/**
 * Default party time (spec §6.2, revised Oct 2026 after parent feedback): most kindergarten
 * birthdays are on weekdays, after barnehage, so weekdays and weekends are treated equally.
 * Mon–Fri 16.30–18.30, Sat–Sun 12.00–14.00, for every age (3–10). Only the short reason varies by age;
 * for a joint birthday the YOUNGEST child's reason is used.
 */
export const WEEKDAY_TIME: [HHMM, HHMM] = ['16:30', '18:30'];
export const WEEKEND_TIME: [HHMM, HHMM] = ['12:00', '14:00'];

interface WhyRow {
  maxAge: number;
  weekday: string;
  weekend: string;
}

const WHY: WhyRow[] = [
  // a weekday party around 16.30–18.30 IS dinner, and children go to bed around 19 (Ekaterina, 21 Oct 2026)
  { maxAge: 6, weekday: 'etter barnehagen, før leggetid', weekend: 'etter lunsj, før middag' },
  { maxAge: 9, weekday: 'etter skole og SFO', weekend: 'etter lunsj, før middag' },
  { maxAge: 10, weekday: 'etter skolen, før leggetid', weekend: 'etter lunsj, før middag' },
];

export function defaultPartyTime(age: number, weekend: boolean): { start: HHMM; end: HHMM; why: string } {
  const row = WHY.find((r) => age <= r.maxAge) ?? WHY[WHY.length - 1];
  const [start, end] = weekend ? WEEKEND_TIME : WEEKDAY_TIME;
  return { start, end, why: weekend ? row.weekend : row.weekday };
}

/** 15-minute steps for the «Endre» time picker. */
export function timeOptions(from = '09:00', to = '21:00'): HHMM[] {
  const out: HHMM[] = [];
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  for (let m = fh * 60 + fm; m <= th * 60 + tm; m += 15) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

/** The clock in Europe/Oslo, in minutes after midnight (like todayOslo, never the device's own zone). */
export function nowMinutesOslo(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Oslo',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return (get('hour') % 24) * 60 + get('minute');
}

/** Less than this before the start (on the day itself) counts as «very soon». */
export const SOON_MINUTES = 60;

/**
 * A soft note under the chosen time on the date step. It looks at the time of day too, not only
 * the date: today at 16.30 when it is already 21.01 has been, it is not «short notice».
 * - 'past'  the start time today has already been
 * - 'soon'  it starts today in less than an hour
 * - 'short' less than SHORT_NOTICE_DAYS away, but there is time («kort tid, men det går»)
 * - null    plenty of time
 * Never blocking: «Neste» works whatever the note says.
 */
export type PartyNotice = 'past' | 'soon' | 'short' | null;

export function partyNotice(
  date: ISODate,
  start: HHMM | null | undefined,
  today: ISODate,
  nowMinutes: number,
): PartyNotice {
  const days = diffDays(today, date);
  if (days < 0) return 'past';
  if (days === 0 && start) {
    const left = minutesOf(start) - nowMinutes;
    if (left <= 0) return 'past';
    if (left < SOON_MINUTES) return 'soon';
  }
  return days < SHORT_NOTICE_DAYS ? 'short' : null;
}
