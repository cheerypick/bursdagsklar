import { describe, expect, it } from 'vitest';
import { dateNotes, nowMinutesOslo, partyNotice, partyTips } from '../rules/partyTime';
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

// 2026-10-21 is a Wednesday. Far enough ahead for no short-notice note: Mon 9 Nov … Sun 15 Nov 2026.
const MON = '2026-11-09';
const WED = '2026-11-11';
const FRI = '2026-11-13';
const SAT = '2026-11-14';
const SUN = '2026-11-15';

describe('soft tips under the time (suggestions, never rules)', () => {
  it('weekday start before 17.00: the barnehage pickup tip', () => {
    expect(partyTips(WED, '16:00', 5)).toEqual(['pickup']);
    expect(partyTips(MON, '16:45', 3)).toEqual(['pickup']);
  });
  it('weekday at 17.00 or later: no tip at all (no bias against weekdays)', () => {
    expect(partyTips(WED, '17:00', 5)).toEqual([]);
    expect(partyTips(MON, '18:00', 5)).toEqual([]);
  });
  it('Friday, Saturday and Sunday: «send the invitation early»', () => {
    expect(partyTips(FRI, '17:00', 5)).toEqual(['busy']);
    expect(partyTips(SAT, '12:00', 5)).toEqual(['busy']);
    expect(partyTips(SUN, '14:00', 8)).toEqual(['busy']);
  });
  it('Friday at 16.00: both tips', () => {
    expect(partyTips(FRI, '16:00', 5)).toEqual(['pickup', 'busy']);
  });
  it('school children get no barnehage tip', () => {
    expect(partyTips(WED, '16:00', 8)).toEqual([]);
  });
  it('no start time yet: no pickup tip', () => {
    expect(partyTips(WED, null, 5)).toEqual([]);
  });
});

describe('the notes under the time: the urgent one first, at most two', () => {
  const NOW = nowMinutesOslo(EVENING);
  it('far ahead: only the tips', () => {
    expect(dateNotes(WED, '17:00', 5, TODAY, NOW)).toEqual([]);
    expect(dateNotes(SAT, '12:00', 5, TODAY, NOW)).toEqual(['busy']);
    expect(dateNotes(FRI, '16:00', 5, TODAY, NOW)).toEqual(['pickup', 'busy']);
  });
  it('the time has been today: only that note, no tips', () => {
    expect(dateNotes(TODAY, '16:00', 5, TODAY, NOW)).toEqual(['past']);
  });
  it('starts within the hour: only that note', () => {
    expect(dateNotes(TODAY, '16:30', 5, TODAY, 16 * 60)).toEqual(['soon']);
  });
  it('short notice: that note first, the pickup tip after it, no «send early»', () => {
    // Friday 23 Oct at 16.00, seen on Wednesday morning
    expect(dateNotes('2026-10-23', '16:00', 5, TODAY, nowMinutesOslo(MORNING))).toEqual(['short', 'pickup']);
    expect(dateNotes('2026-10-24', '12:00', 5, TODAY, nowMinutesOslo(MORNING))).toEqual(['short']);
  });
  it('never more than two', () => {
    for (const d of [TODAY, '2026-10-23', '2026-10-24', MON, FRI, SAT, SUN])
      for (const s of ['09:00', '16:00', '17:00', '20:00'])
        for (const now of [0, 10 * 60, NOW]) expect(dateNotes(d, s, 4, TODAY, now).length).toBeLessThanOrEqual(2);
  });
});
