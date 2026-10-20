import { describe, expect, it } from 'vitest';
import {
  addMonths,
  canGoMonth,
  dayLabel,
  daysInMonth,
  isLeapYear,
  monthGrid,
  monthTitle,
  moveFocus,
  shiftMonth,
  WEEKDAY_HEADERS,
} from '../rules/calendar';
import { dateBounds } from '../rules/dates';

const TODAY = '2026-10-20'; // a Tuesday
const { min, max } = dateBounds(TODAY);

describe('our month calendar (pure logic)', () => {
  it('Norwegian, Monday first', () => {
    expect(WEEKDAY_HEADERS.join(' ')).toBe('ma ti on to fr lø sø');
    expect(monthTitle({ y: 2026, m: 10 })).toBe('Oktober 2026');
    expect(dayLabel('2026-11-11')).toBe('onsdag 11. november 2026');
  });
  it('October 2026 starts on a Thursday: 3 blanks, then 1–31, padded to whole weeks', () => {
    const weeks = monthGrid({ y: 2026, m: 10 }, { min, max, today: TODAY });
    expect(weeks).toHaveLength(5);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0][3]?.iso).toBe('2026-10-01');
    expect(weeks[4][5]?.iso).toBe('2026-10-31'); // Saturday
    expect(weeks[4][6]).toBeNull();
  });
  it('a month starting on Monday has no leading blanks (June 2026)', () => {
    const weeks = monthGrid({ y: 2026, m: 6 }, { min, max, today: TODAY });
    expect(weeks[0][0]?.iso).toBe('2026-06-01');
  });
  it('February 2027 starts on Monday and fits exactly four weeks', () => {
    const weeks = monthGrid({ y: 2027, m: 2 }, { min, max, today: TODAY });
    expect(weeks).toHaveLength(4);
    expect(weeks[3][6]?.iso).toBe('2027-02-28');
  });
  it('leap years', () => {
    expect([2024, 2027, 2028, 1900, 2000].map(isLeapYear)).toEqual([true, false, true, false, true]);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2026, 11)).toBe(30);
    const feb28 = monthGrid({ y: 2028, m: 2 }, { min: '2028-01-01', max: '2028-12-31', today: '2028-01-01' });
    expect(feb28.flat().filter(Boolean)).toHaveLength(29);
  });
  it('past days are disabled, today is marked, a year ahead is the limit', () => {
    const cells = monthGrid({ y: 2026, m: 10 }, { min, max, today: TODAY }).flat();
    const day = (d: number) => cells.find((c) => c?.day === d)!;
    expect(day(19).disabled).toBe(true);
    expect(day(20)).toMatchObject({ disabled: false, isToday: true });
    expect(day(21)).toMatchObject({ disabled: false, isToday: false });
    expect(max).toBe('2027-10-20');
    const next = monthGrid({ y: 2027, m: 10 }, { min, max, today: TODAY }).flat();
    expect(next.find((c) => c?.day === 20)?.disabled).toBe(false);
    expect(next.find((c) => c?.day === 21)?.disabled).toBe(true);
  });
  it('the arrows stop at this month and at a year ahead', () => {
    expect(canGoMonth({ y: 2026, m: 10 }, -1, min, max)).toBe(false);
    expect(canGoMonth({ y: 2026, m: 10 }, 1, min, max)).toBe(true);
    expect(canGoMonth({ y: 2027, m: 10 }, 1, min, max)).toBe(false);
    expect(addMonths({ y: 2026, m: 12 }, 1)).toEqual({ y: 2027, m: 1 });
    expect(addMonths({ y: 2027, m: 1 }, -1)).toEqual({ y: 2026, m: 12 });
  });
  it('keyboard: arrows by day and week, Page Up/Down by month, never into the past', () => {
    expect(moveFocus('2026-11-11', 'ArrowRight', min, max)).toBe('2026-11-12');
    expect(moveFocus('2026-11-11', 'ArrowDown', min, max)).toBe('2026-11-18');
    expect(moveFocus('2026-11-11', 'ArrowUp', min, max)).toBe('2026-11-04');
    expect(moveFocus('2026-11-11', 'PageDown', min, max)).toBe('2026-12-11');
    expect(moveFocus('2026-11-11', 'Home', min, max)).toBe('2026-11-09'); // Monday
    expect(moveFocus('2026-11-11', 'End', min, max)).toBe('2026-11-15'); // Sunday
    expect(moveFocus('2026-10-21', 'ArrowUp', min, max)).toBe(TODAY);
    expect(moveFocus('2026-11-11', 'x', min, max)).toBeNull();
    expect(shiftMonth('2027-01-31', 1)).toBe('2027-02-28');
  });
});
