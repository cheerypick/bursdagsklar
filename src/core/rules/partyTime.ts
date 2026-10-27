import type { HHMM, ISODate } from '../model';
import { SHORT_NOTICE_DAYS } from './constants';
import { diffDays, minutesOf, weekday } from './dates';
import { t } from '../../i18n/i18n';

/**
 * Default party time (spec §6.2, revised by Ekaterina 21 Oct 2026). Weekdays and weekends are treated
 * equally: no day is pushed or advised against. The time is only a suggestion and is always editable.
 * - Mon–Fri, every age: 17.00–19.00, after barnehage/school, «passer fint rundt middag».
 * - Sat–Sun, ages 3–6: 12.00–14.00, the middle of the day, «passer fint rundt lunsj».
 * - Sat–Sun, ages 7–10: 14.00–16.00, after lunch, before dinner.
 * For a joint birthday everything follows the YOUNGEST child.
 */
export const WEEKDAY_TIME: [HHMM, HHMM] = ['17:00', '19:00'];
export const WEEKEND_TIME_SMALL: [HHMM, HHMM] = ['12:00', '14:00'];
export const WEEKEND_TIME_BIG: [HHMM, HHMM] = ['14:00', '16:00'];
/** Up to this age the child is in barnehage: weekend lunch party, barnehage wording in the hints. */
export const BARNEHAGE_MAX_AGE = 6;

export function defaultPartyTime(age: number, weekend: boolean): { start: HHMM; end: HHMM; why: string } {
  const small = age <= BARNEHAGE_MAX_AGE;
  if (weekend) {
    const [start, end] = small ? WEEKEND_TIME_SMALL : WEEKEND_TIME_BIG;
    return { start, end, why: t(small ? 'rules.time.weekendSmall' : 'rules.time.weekendBig') };
  }
  const [start, end] = WEEKDAY_TIME;
  return { start, end, why: t(small ? 'rules.time.weekdaySmall' : 'rules.time.weekdayBig') };
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

/**
 * Soft tips under the time on the date step (Ekaterina, 21 Oct 2026). Suggestions only, never rules:
 * we don't know when each barnehage closes, and every day is a fine party day.
 * - 'pickup' a weekday start before 17.00 for barnehage children: maybe pick the children up yourselves
 * - 'busy'   Friday, Saturday or Sunday: some may have other plans, so send the invitation early
 */
export type PartyTip = 'pickup' | 'busy';
export type DateNote = Exclude<PartyNotice, null> | PartyTip;

/** The weekday start the barnehage tip is measured against. */
export const PICKUP_TIP_BEFORE: HHMM = '17:00';

export function partyTips(date: ISODate, start: HHMM | null | undefined, age: number): PartyTip[] {
  const wd = weekday(date); // 0 = Sunday … 6 = Saturday
  const tips: PartyTip[] = [];
  const weekdayParty = wd >= 1 && wd <= 5;
  if (weekdayParty && start && age <= BARNEHAGE_MAX_AGE && minutesOf(start) < minutesOf(PICKUP_TIP_BEFORE)) {
    tips.push('pickup');
  }
  if (wd === 5 || wd === 6 || wd === 0) tips.push('busy');
  return tips;
}

/** At most this many notes under the time, so the step stays calm. */
export const MAX_DATE_NOTES = 2;

/**
 * Everything shown under the time, in order, at most MAX_DATE_NOTES:
 * - the time has been / starts within the hour: only that note (the tips don't matter today)
 * - short notice: that note first, then the pickup tip; «send early» is left out, there is no «early» left
 * - otherwise: the tips
 */
export function dateNotes(
  date: ISODate,
  start: HHMM | null | undefined,
  age: number,
  today: ISODate,
  nowMinutes: number,
): DateNote[] {
  const notice = partyNotice(date, start, today, nowMinutes);
  if (notice === 'past' || notice === 'soon') return [notice];
  const tips = partyTips(date, start, age);
  const notes: DateNote[] = notice === 'short' ? ['short', ...tips.filter((t) => t !== 'busy')] : tips;
  return notes.slice(0, MAX_DATE_NOTES);
}
