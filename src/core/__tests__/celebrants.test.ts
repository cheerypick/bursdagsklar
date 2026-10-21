import { describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import { agePhrase, AGES, agesText, clampAge, joinNames, oldestAge, youngestAge } from '../rules/celebrants';
import { sausages, shoppingList } from '../rules/food';
import { headCount } from '../rules/people';
import { buildTasks } from '../rules/todos';
import { defaultPartyTime } from '../rules/partyTime';

const jointEmmaJonas = () =>
  emma({
    celebrants: [
      { id: 'c1', name: 'Emma', age: 5 },
      { id: 'c2', name: 'Jonas', age: 7 },
    ],
    // the same real party as before the one children number: 12 guests + Emma + Jonas
    children: 14,
  });

describe('ages 3–10', () => {
  it('the age choices start at 3 and end at 10', () => {
    expect(AGES).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it('older saved ages are kept inside the range', () => {
    expect([1, 2, 3, 10, 12].map(clampAge)).toEqual([3, 3, 3, 10, 10]);
  });
});

describe('joint birthday: names and ages', () => {
  it('names are joined Norwegian-style', () => {
    expect(joinNames(['Emma'])).toBe('Emma');
    expect(joinNames(['Emma', 'Jonas'])).toBe('Emma og Jonas');
    expect(joinNames(['Emma', 'Jonas', 'Ali'])).toBe('Emma, Jonas og Ali');
    expect(joinNames([' Emma ', ''])).toBe('Emma');
  });
  it('the age phrase says a shared age once', () => {
    expect(agePhrase([5])).toBe('fyller 5');
    expect(agePhrase([7, 5])).toBe('fyller 5 og 7');
    expect(agePhrase([5, 5])).toBe('fyller 5');
    expect(agesText([4, 7, 5, 7])).toBe('4, 5 og 7');
  });
  it('youngest and oldest', () => {
    const cs = jointEmmaJonas().celebrants;
    expect(youngestAge(cs)).toBe(5);
    expect(oldestAge(cs)).toBe(7);
  });
});

describe('joint birthday: the rules', () => {
  it('the one children number counts both birthday children: 14 children = 14 kids eating', () => {
    expect(headCount(jointEmmaJonas())).toMatchObject({ kidsComing: 14, adultsEating: 4 });
  });
  it('portions use the OLDEST child (7 → band C), so nobody goes hungry', () => {
    const list = shoppingList(jointEmmaJonas());
    const grill = list.find((i) => i.id === 'grillpolser')!;
    const asOldest = sausages('grillpolser', { kidsComing: 14, adultsEating: 4, age: 7 });
    expect(grill.need).toBe(asOldest.need);
    // sausages are 3 per child at every age 3–10 (her rule, 21 Oct 2026): 14 × 3 + 4 × 2 = 50
    expect(asOldest.need).toBe(50);
  });
  it('the time reason uses the YOUNGEST child', () => {
    expect(defaultPartyTime(youngestAge(jointEmmaJonas().celebrants), false).why).toBe(
      'etter barnehagen, før leggetid',
    );
  });
  it('one shared cake, one candle set per birthday child', () => {
    const list = shoppingList(jointEmmaJonas());
    const candles = list.find((i) => i.id === 'kakelys')!;
    expect(candles.need).toBe(6 + 8);
    expect(candles.why).toBe('Ett lys-sett per bursdagsbarn');
    const tasks = buildTasks(jointEmmaJonas()).tasks;
    expect(tasks.find((t) => t.id === 'bakeMuffins')?.detail).toContain('Ett lys-sett per bursdagsbarn');
    const bought = buildTasks({ ...jointEmmaJonas(), cake: { mode: 'buy', cakeId: 'x', muffins: false } });
    expect(bought.tasks.find((t) => t.id === 'orderCake')).toMatchObject({
      title: 'Bestill én felles kake',
      detail: 'Stor nok til alle gjestene. Ett lys-sett per bursdagsbarn',
    });
    // one child: unchanged
    expect(shoppingList(emma()).find((i) => i.id === 'kakelys')?.need).toBe(6);
  });
});
