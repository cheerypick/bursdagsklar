import { describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import { dayChecklist, daySteps, mealHint, partyDayView } from '../rules/partyDay';
import { clockBefore, dayPrepRows } from '../rules/dayPrep';
import { buildTasks, groupTasks, isDone } from '../rules/todos';
import { toggleTask } from '../party';
import { i18n } from '../../i18n/i18n';
import type { Party } from '../model';

const ids = (p: Party) => dayChecklist(p).map((c) => c.task.id);
const steps = (p: Party) => daySteps(p).map((s) => `${s.time} ${s.id}`);

/** Emma and Jonas (5 and 7) on a Thursday 17–19: frozen pizza, a bought cake, nothing picked on Program. */
const joint = (over: Partial<Party> = {}) =>
  emma({
    celebrants: [
      { id: 'c1', name: 'Emma', age: 5 },
      { id: 'c2', name: 'Jonas', age: 7 },
    ],
    date: '2026-11-05',
    start: '17:00',
    end: '19:00',
    menu: { kind: 'pizza', style: 'frossen' },
    cake: { mode: 'buy', cakeId: 'kjopt', muffins: false, kind: 'buy' },
    programme: { activities: [] },
    ...over,
  });

describe('Festdagen: the checklist (the to-dos of the party day)', () => {
  it('Emma: the jobs of the day in clock order, counted back from the day’s order', () => {
    const list = dayChecklist(emma());
    expect(list.map((c) => [c.task.id, c.time])).toEqual([
      ['dayActivities', '11:15'],
      ['hideTreasure', '11:30'],
      ['dayFood-grill', '11:45'],
      ['dayCake', '12:50'],
    ]);
    // «Festdagen» itself points to this screen: not on its own checklist
    expect(ids(emma())).not.toContain('partyDay');
    const grill = list.find((c) => c.task.id === 'dayFood-grill')!.task;
    expect(grill.title).toBe('Tenn grillen');
    expect(grill.detail).toBe('Ca. kl. 11.45, så er den varm til maten rundt kl. 12.15');
  });

  it('the same to-dos are in Gjøremål on the party day, and one tick is the same tick in both', () => {
    const p = emma();
    const day = buildTasks(p)
      .tasks.filter((x) => x.date === p.date)
      .map((x) => x.id);
    for (const id of ids(p)) expect(day).toContain(id);
    const ticked = toggleTask(p, 'dayFood-grill', true, '2026-11-07T10:00:00.000Z');
    expect(dayChecklist(ticked).find((c) => c.task.id === 'dayFood-grill')!.done).toBe(true);
    const inTodo = groupTasks(ticked, buildTasks(ticked).tasks, '2026-11-01')
      .flatMap((g) => g.tasks)
      .find((x) => x.task.id === 'dayFood-grill')!;
    expect(inTodo.done).toBe(true);
    // and the other way: ticked in Gjøremål (taskState) shows ticked on Festdagen
    const fromTodo = toggleTask(p, 'hideTreasure', true, '2026-11-07T10:00:00.000Z');
    const task = buildTasks(fromTodo).tasks.find((x) => x.id === 'hideTreasure')!;
    expect(isDone(fromTodo, task)).toBe(true);
    expect(dayChecklist(fromTodo).find((c) => c.task.id === 'hideTreasure')!.done).toBe(true);
  });

  it('nothing is assumed: no menu → no food job; no Program picks → no play things; no bags → no bag job', () => {
    const p = emma({ menu: null, programme: { activities: [] }, goodieBags: { contents: [], skip: true } });
    expect(ids(p)).toEqual(['dayCake']);
  });

  it('joint party with frozen pizza and a bought cake: the oven before the guests, one candle set each', () => {
    const list = dayChecklist(joint());
    expect(list.map((c) => [c.task.id, c.time])).toEqual([
      ['dayBags', '16:45'],
      ['dayFood-pizzaOven', '16:50'],
      ['dayCake', '18:05'],
    ]);
    const cake = list.find((c) => c.task.id === 'dayCake')!.task;
    expect(cake.title).toBe('Ta kaken ut av kjøleskapet');
    expect(cake.detail).toContain('Ett lys-sett per bursdagsbarn');
  });

  it('pølser and pizza together: one job per kind of food', () => {
    const p = emma({
      menu: {
        kind: 'flere',
        dishes: [{ kind: 'wienerpolser' }, { kind: 'pizza', style: 'bestilt', takeawaySize: '40' }],
      },
    });
    expect(ids(p)).toEqual(expect.arrayContaining(['dayFood-wiener', 'dayFood-pizzaOrdered']));
  });

  it('a party planned on the day itself: the earlier to-dos land on the day too, shown first without a time', () => {
    const p = emma({ plannedFrom: '2026-11-07' });
    const list = dayChecklist(p);
    expect(list[0].time).toBeNull();
    expect(list.map((c) => c.task.id)).toContain('shopForParty');
    expect(list.filter((c) => c.time !== null).map((c) => c.task.id)).toEqual([
      'dayActivities',
      'hideTreasure',
      'dayFood-grill',
      'dayCake',
    ]);
  });

  it('a hidden to-do stays hidden on Festdagen too', () => {
    const p = emma({ taskState: { dayCake: { done: false, hidden: true } } });
    expect(ids(p)).not.toContain('dayCake');
  });

  it('clockBefore wraps around midnight', () => {
    expect(clockBefore('00:15', 30)).toBe('23:45');
    expect(clockBefore('12:00', 45)).toBe('11:15');
  });

  it('dayPrepRows: every row has a time and a link', () => {
    for (const r of dayPrepRows(emma())) {
      expect(r.time).toMatch(/^\d\d:\d\d$/);
      expect(r.link?.route).toMatch(/^\//);
    }
  });
});

describe('Festdagen: the day step by step', () => {
  it('Emma 12–14 with skattejakt + piñata: arrival, food, the picks, cake and song, goodie bags, pickup', () => {
    expect(steps(emma())).toEqual([
      '12.00 arrive',
      '12.15 food',
      '12.40 skattejakt',
      '13.00 cake',
      '13.15 pinata',
      '13.30 play',
      '13.50 home',
      '14.00 pickup',
    ]);
    const s = daySteps(emma());
    expect(s.find((x) => x.id === 'food')).toMatchObject({
      title: 'Mat: Grillpølser',
      detail: 'Passer fint rundt lunsj',
    });
    expect(s.find((x) => x.id === 'cake')!.title).toBe('Kake og bursdagssang');
    expect(s.find((x) => x.id === 'skattejakt')!.activity).toBe('skattejakt');
    expect(s.find((x) => x.id === 'pinata')!.title).toBe('Enhjørning-piñata');
  });

  it('nothing picked on Program: free play instead, and the screen offers Program softly', () => {
    const v = partyDayView(joint(), '2026-11-01');
    expect(v.noActivities).toBe(true);
    expect(steps(joint())).toEqual([
      '17.00 arrive',
      '17.15 food',
      '17.40 play',
      '18.35 cake',
      '18.50 home',
      '19.00 pickup',
    ]);
    expect(daySteps(joint()).find((x) => x.id === 'cake')!.detail).toBe('Ett lys-sett per bursdagsbarn');
  });

  it('the meal hint is soft and only around lunch or dinner, never «maten blir …»', () => {
    expect(mealHint('12:15')).toBe('Passer fint rundt lunsj');
    expect(mealHint('17:15')).toBe('Passer fint rundt middag');
    expect(mealHint('14:30')).toBeNull();
    const food = daySteps(emma({ menu: null })).find((x) => x.id === 'food')!;
    expect(food.title).toBe('Mat');
    for (const s of [...daySteps(emma()), ...daySteps(joint())]) expect(s.detail ?? '').not.toMatch(/maten blir/i);
  });

  it('without goodie bags the goodbye is just «Takk for i dag»', () => {
    const p = emma({ goodieBags: { contents: [], skip: true } });
    expect(daySteps(p).find((x) => x.id === 'home')!.title).toBe('Takk for i dag og hjem');
  });
});

describe('Festdagen: header, notes and links', () => {
  it('header: names and ages, date, time span; before / today / after', () => {
    const v = partyDayView(joint(), '2026-11-01');
    expect(v).toMatchObject({
      title: 'Emma og Jonas fyller 5 og 7',
      dateLine: 'Torsdag 5. november',
      timeLine: '17–19',
      when: 'before',
      daysLeft: 4,
    });
    expect(partyDayView(emma(), '2026-11-07').when).toBe('today');
    expect(partyDayView(emma(), '2026-11-08')).toMatchObject({ when: 'after', daysLeft: 0 });
  });

  it('allergies: the guests’ notes (not those who said no) and the needs ticked on Mat, notes only', () => {
    const p = joint({
      guests: [
        { id: 'g1', name: 'Ola', status: 'yes', note: 'nøtter' },
        { id: 'g2', name: 'Sara', status: 'no', note: 'gluten' },
        { id: 'g3', name: 'Mia', status: 'pending', note: '  ' },
        { id: 'g4', name: 'Ali', status: 'pending', note: 'ikke svin' },
      ],
      diets: ['glutenfri', 'vegetar'],
    });
    const v = partyDayView(p, '2026-11-01');
    expect(v.guestNotes).toEqual([
      { name: 'Ola', note: 'nøtter' },
      { name: 'Ali', note: 'ikke svin' },
    ]);
    expect(v.diets).toEqual(['Glutenfri', 'Vegetar']);
  });

  it('an empty guest list is fine: no notes', () => {
    const v = partyDayView(emma(), '2026-11-01');
    expect(v.guestNotes).toEqual([]);
    expect(v.diets).toEqual([]);
  });

  it('links: what is left on Handleliste and the phone on the invitation', () => {
    const p = emma({ invitation: { phone: '900 00 000' } });
    const all = partyDayView(p, '2026-11-01');
    expect(all.phone).toBe('900 00 000');
    expect(partyDayView(emma({ invitation: { phone: '90000000' } }), '2026-11-01').phone).toBe('900 00 000');
    expect(all.shoppingLeft).toBe(all.shoppingCount);
    const one = partyDayView({ ...p, shopping: { ticked: ['grillpolser'], custom: [] } }, '2026-11-01');
    expect(one.shoppingLeft).toBe(all.shoppingCount - 1);
  });

  it('English', () => {
    void i18n.changeLanguage('en');
    try {
      const v = partyDayView(emma(), '2026-11-07');
      expect(v.checklist.find((c) => c.task.id === 'dayFood-grill')!.task.title).toBe('Light the grill');
      expect(v.steps.find((s) => s.id === 'cake')!.title).toBe('Cake and birthday song');
      expect(v.steps.find((s) => s.id === 'food')!.detail).toBe('Nice around lunchtime');
    } finally {
      void i18n.changeLanguage('nb');
    }
  });
});
