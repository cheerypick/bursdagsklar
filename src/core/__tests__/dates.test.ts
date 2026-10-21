import { describe, expect, it } from 'vitest';
import {
  dateBounds,
  pickedDate,
  isWeekend,
  formatLong,
  weekday,
  todayOslo,
  formatRangeCompact,
  formatRange,
} from '../rules/dates';
import { defaultPartyTime } from '../rules/partyTime';

const TODAY = '2026-10-19'; // Monday

describe('date picker bounds and shortcuts (spec §6.3)', () => {
  it('range is today to one year ahead', () => {
    expect(dateBounds(TODAY)).toEqual({ min: '2026-10-19', max: '2027-10-19' });
  });
  it('accepts a picked value inside the range', () => {
    expect(pickedDate('2026-11-08', TODAY)).toBe('2026-11-08');
    expect(pickedDate('2026-10-19', TODAY)).toBe('2026-10-19');
    expect(pickedDate('2027-10-19', TODAY)).toBe('2027-10-19');
  });
  it('rejects empty, malformed, impossible and out-of-range values', () => {
    expect(pickedDate('', TODAY)).toBeNull();
    expect(pickedDate('8. november', TODAY)).toBeNull();
    expect(pickedDate('2026-11-31', TODAY)).toBeNull();
    expect(pickedDate('2026-10-18', TODAY)).toBeNull();
    expect(pickedDate('2027-10-20', TODAY)).toBeNull();
  });
});

describe('weekdays and weekends are treated equally', () => {
  it('only Saturday and Sunday count as weekend', () => {
    expect(isWeekend('2026-11-07')).toBe(true); // Saturday
    expect(isWeekend('2026-11-08')).toBe(true); // Sunday
    for (const d of ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']) {
      expect(isWeekend(d)).toBe(false);
    }
  });
});

describe('formatting', () => {
  it('formats nb-NO dates and times', () => {
    expect(formatLong('2026-11-07')).toBe('lørdag 7. november');
    expect(weekday('2026-11-08')).toBe(0);
    expect(formatRangeCompact('12:00', '14:00')).toBe('12–14');
    expect(formatRangeCompact('12:30', '14:30')).toBe('12.30–14.30');
    expect(formatRange('12:00', '14:00')).toBe('12.00–14.00');
  });
  it('today is the Oslo calendar date', () => {
    // 23:30 UTC on 19 Oct is already 20 Oct in Oslo (UTC+2)
    expect(todayOslo(new Date('2026-10-19T23:30:00Z'))).toBe('2026-10-20');
  });
});

describe('default party time (spec §6.2, revised 21 Oct 2026: weekdays are normal)', () => {
  it('weekday: 17.00–19.00 for every age, the food is dinner', () => {
    expect(defaultPartyTime(5, false)).toEqual({
      start: '17:00',
      end: '19:00',
      why: 'etter barnehagen – maten blir middag',
    });
    for (let age = 3; age <= 10; age++)
      expect(defaultPartyTime(age, false)).toMatchObject({ start: '17:00', end: '19:00' });
  });
  it('weekend, 3–6 years: 12.00–14.00, the food is lunch', () => {
    expect(defaultPartyTime(5, true)).toEqual({
      start: '12:00',
      end: '14:00',
      why: 'midt på dagen – maten blir lunsj',
    });
    for (const age of [3, 4, 6]) expect(defaultPartyTime(age, true)).toMatchObject({ start: '12:00', end: '14:00' });
  });
  it('weekend, 7–10 years: 14.00–16.00, after lunch', () => {
    expect(defaultPartyTime(8, true)).toEqual({ start: '14:00', end: '16:00', why: 'etter lunsj, før middag' });
    for (const age of [7, 9, 10]) expect(defaultPartyTime(age, true)).toMatchObject({ start: '14:00', end: '16:00' });
  });
  it('school children are not told «barnehagen»', () => {
    for (let age = 7; age <= 10; age++) expect(defaultPartyTime(age, false).why).not.toContain('barnehage');
  });
});
