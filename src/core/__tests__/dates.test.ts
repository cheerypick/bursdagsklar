import { describe, expect, it } from 'vitest';
import {
  parseDateInput,
  weekendNudge,
  formatLong,
  weekday,
  todayOslo,
  formatRangeCompact,
  formatRange,
} from '../rules/dates';
import { defaultPartyTime } from '../rules/partyTime';

const TODAY = '2026-10-19'; // Monday

describe('parseDateInput (spec §6.3)', () => {
  it.each([
    ['8. november', '2026-11-08'],
    ['8 nov', '2026-11-08'],
    ['8.11', '2026-11-08'],
    ['08.11.2026', '2026-11-08'],
    ['lørdag 7. november', '2026-11-07'],
    ['Lørdag 7. November', '2026-11-07'],
    ['7/11', '2026-11-07'],
    ['2026-11-07', '2026-11-07'],
    ['19. oktober', '2026-10-19'],
    ['3. mars', '2027-03-03'], // no year: next occurrence
    ['1. jan', '2027-01-01'],
  ])('%s → %s', (input, expected) => {
    expect(parseDateInput(input, TODAY)).toEqual({ ok: true, date: expected });
  });

  it('rejects past dates with a year', () => {
    expect(parseDateInput('01.10.2026', TODAY)).toEqual({ ok: false, reason: 'past' });
  });
  it('rejects dates more than 365 days ahead', () => {
    expect(parseDateInput('01.12.2027', TODAY)).toEqual({ ok: false, reason: 'too-far' });
  });
  it('rejects nonsense and impossible dates', () => {
    expect(parseDateInput('neste uke', TODAY).ok).toBe(false);
    expect(parseDateInput('31.11', TODAY).ok).toBe(false);
    expect(parseDateInput('', TODAY)).toEqual({ ok: false, reason: 'empty' });
  });
});

describe('weekend check (spec §6.3)', () => {
  it('Saturday: no nudge', () => {
    expect(weekendNudge('2026-11-07', TODAY)).toBeNull();
  });
  it('«8. november» is a Sunday → suggests Saturday 7th', () => {
    const n = weekendNudge('2026-11-08', TODAY)!;
    expect(n.saturday).toBe('2026-11-07');
    expect(n.question).toBe('8. november er en søndag. Mente du lørdag 7.?');
    expect(n.yes).toBe('Ja, lørdag 7.');
    expect(n.no).toBe('Nei, søndag 8.');
  });
  it('Monday–Wednesday → previous Saturday', () => {
    const n = weekendNudge('2026-11-11', TODAY)!; // Wednesday
    expect(n.saturday).toBe('2026-11-07');
    expect(n.question).toBe('11. november er en onsdag. Mente du lørdag 7.?');
    expect(n.no).toBe('Nei, onsdag passer');
  });
  it('Thursday–Friday → next Saturday', () => {
    expect(weekendNudge('2026-11-12', TODAY)!.saturday).toBe('2026-11-14');
    expect(weekendNudge('2026-11-13', TODAY)!.saturday).toBe('2026-11-14');
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
