import type { HHMM } from '../model';

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
