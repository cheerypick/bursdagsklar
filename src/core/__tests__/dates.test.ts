import { describe, expect, it } from 'vitest';
import {
  dateBounds,
  pickedDate,
  nextSaturdays,
  weekendNudge,
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
  it('next three Saturdays', () => {
    expect(nextSaturdays(TODAY)).toEqual(['2026-10-24', '2026-10-31', '2026-11-07']);
    expect(nextSaturdays('2026-10-24', 2)).toEqual(['2026-10-24', '2026-10-31']);
  });
});

describe('weekend check (spec §6.3)', () => {
  it('Saturday: no nudge', () => {
    expect(weekendNudge('2026-11-07', TODAY)).toBeNull();
  });
  it('«8. november» is a Sunday → suggests Saturday 7th', () => {
    const n = weekendNudge('2026-11-08', TODAY)!;
    expect(n.saturday).toBe('2026-11-07');
    expect(n.question).toBe('Det er en søndag – passer det? Lørdag 7.?');
    expect(n.yes).toBe('Bytt til lørdag 7.');
  });
  it('Monday–Wednesday → previous Saturday', () => {
    const n = weekendNudge('2026-11-11', TODAY)!; // Wednesday
    expect(n.saturday).toBe('2026-11-07');
    expect(n.question).toBe('Det er en onsdag – passer det? Lørdag 7.?');
  });
  it('Thursday–Friday → next Saturday', () => {
    expect(weekendNudge('2026-11-12', TODAY)!.saturday).toBe('2026-11-14');
    expect(weekendNudge('2026-11-13', TODAY)!.saturday).toBe('2026-11-14');
  });
  it('names the month when the Saturday is in another month', () => {
    const n = weekendNudge('2026-11-01', TODAY)!; // Sunday
    expect(n.saturday).toBe('2026-10-31');
    expect(n.question).toBe('Det er en søndag – passer det? Lørdag 31. oktober?');
    expect(n.yes).toBe('Bytt til lørdag 31. oktober');
  });
  it('a suggested Saturday in the past falls forward', () => {
    // Tuesday 20 Oct: previous Saturday 17 Oct is past → next Saturday 24 Oct
    expect(weekendNudge('2026-10-20', TODAY)!.saturday).toBe('2026-10-24');
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

describe('default party time (spec §6.2)', () => {
  it('age 5 weekend: 12.00–14.00, etter lunsj, før middag', () => {
    expect(defaultPartyTime(5, true)).toEqual({ start: '12:00', end: '14:00', why: 'etter lunsj, før middag' });
  });
  it('weekday and other bands', () => {
    expect(defaultPartyTime(5, false).start).toBe('17:00');
    expect(defaultPartyTime(8, true).end).toBe('14:30');
    expect(defaultPartyTime(11, true)).toMatchObject({ start: '14:00', end: '17:00' });
    expect(defaultPartyTime(2, true)).toMatchObject({ start: '11:00', end: '12:30' });
  });
});
