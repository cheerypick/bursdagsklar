import { describe, expect, it } from 'vitest';
import { nowMinutesOslo, partyNotice } from '../rules/partyTime';
import { todayOslo } from '../rules/dates';

// A fixed clock: Wednesday 21 October 2026, 21.01 in Oslo (summer time, UTC+2).
const EVENING = new Date('2026-10-21T19:01:00Z');
const MORNING = new Date('2026-10-21T08:00:00Z'); // 10.00 in Oslo
const TODAY = todayOslo(EVENING);

describe('the clock in Oslo', () => {
  it('reads the Oslo date and time, not UTC', () => {
    expect(TODAY).toBe('2026-10-21');
    expect(nowMinutesOslo(EVENING)).toBe(21 * 60 + 1);
    expect(nowMinutesOslo(MORNING)).toBe(10 * 60);
    // 23.30 UTC is already tomorrow in Oslo
    expect(todayOslo(new Date('2026-10-21T23:30:00Z'))).toBe('2026-10-22');
    expect(nowMinutesOslo(new Date('2026-10-21T23:30:00Z'))).toBe(1 * 60 + 30);
    // winter time (UTC+1)
    expect(nowMinutesOslo(new Date('2026-12-01T12:00:00Z'))).toBe(13 * 60);
  });
});

describe('the soft note on the date step looks at the time of day too', () => {
  it('today 16.30 when it is already 21.01: the time has been (not «det går»)', () => {
    expect(partyNotice(TODAY, '16:30', TODAY, nowMinutesOslo(EVENING))).toBe('past');
  });
  it('today 16.30 at 10.00 in the morning: short notice, but it works', () => {
    expect(partyNotice(TODAY, '16:30', TODAY, nowMinutesOslo(MORNING))).toBe('short');
  });
  it('today, starting in less than an hour: soon', () => {
    expect(partyNotice(TODAY, '16:30', TODAY, 16 * 60)).toBe('soon');
    expect(partyNotice(TODAY, '16:30', TODAY, 16 * 60 + 30)).toBe('past');
  });
  it('tomorrow, even late in the evening: short notice as before, never past', () => {
    expect(partyNotice('2026-10-22', '16:30', TODAY, nowMinutesOslo(EVENING))).toBe('short');
  });
  it('a week or more ahead: no note', () => {
    expect(partyNotice('2026-10-28', '16:30', TODAY, nowMinutesOslo(EVENING))).toBeNull();
    expect(partyNotice('2026-11-21', '12:00', TODAY, nowMinutesOslo(EVENING))).toBeNull();
  });
  it('a day before today has been, whatever the time', () => {
    expect(partyNotice('2026-10-20', '16:30', TODAY, 0)).toBe('past');
  });
  it('no time yet: only the date counts', () => {
    expect(partyNotice(TODAY, null, TODAY, nowMinutesOslo(EVENING))).toBe('short');
  });
});
