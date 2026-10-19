import type { HHMM } from '../model';

/** Default party time by age (spec §6.2). */
interface TimeRow {
  minAge: number;
  maxAge: number;
  weekend: [HHMM, HHMM];
  weekday: [HHMM, HHMM];
  chipWeekend: string;
  chipWeekday: string;
}

const ROWS: TimeRow[] = [
  {
    minAge: 1,
    maxAge: 2,
    weekend: ['11:00', '12:30'],
    weekday: ['16:30', '18:00'],
    chipWeekend: 'før middagsluren',
    chipWeekday: 'kort og rolig',
  },
  {
    minAge: 3,
    maxAge: 6,
    weekend: ['12:00', '14:00'],
    weekday: ['17:00', '19:00'],
    chipWeekend: 'etter lunsj, før middag',
    chipWeekday: 'etter barnehagen, før leggetid',
  },
  {
    minAge: 7,
    maxAge: 9,
    weekend: ['12:00', '14:30'],
    weekday: ['17:00', '19:00'],
    chipWeekend: 'tid til litt flere leker',
    chipWeekday: 'tid til litt flere leker',
  },
  {
    minAge: 10,
    maxAge: 12,
    weekend: ['14:00', '17:00'],
    weekday: ['17:00', '19:30'],
    chipWeekend: 'store barn vil ha god tid',
    chipWeekday: 'store barn vil ha god tid',
  },
];

export function defaultPartyTime(age: number, weekend: boolean): { start: HHMM; end: HHMM; why: string } {
  const row = ROWS.find((r) => age >= r.minAge && age <= r.maxAge) ?? ROWS[1];
  const [start, end] = weekend ? row.weekend : row.weekday;
  return { start, end, why: weekend ? row.chipWeekend : row.chipWeekday };
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
