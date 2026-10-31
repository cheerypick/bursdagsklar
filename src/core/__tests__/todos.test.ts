import { describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import {
  buildTasks,
  groupTasks,
  mergeShoppingTaskState,
  nextTask,
  progress,
  rsvpOffset,
  tickable,
  isDone,
} from '../rules/todos';
import { migrate } from '../storage/PartyRepository';
import { formatShort } from '../rules/dates';
import { toggleHome, toggleTask } from '../party';

const dates = (p = emma()) => Object.fromEntries(buildTasks(p).tasks.map((t) => [t.id, formatShort(t.date)]));

describe('to-dos, test vector A (spec §6.1)', () => {
  const plan = buildTasks(emma());
  it('avail 19, R 7', () => {
    expect(plan.avail).toBe(19);
    expect(plan.R).toBe(7);
    expect(plan.rsvpDeadline).toBe('2026-10-31');
  });
  it('dates every task exactly as the spec table', () => {
    expect(dates()).toEqual({
      guestList: 'man 19. okt',
      sendInvite: 'man 19. okt',
      printCards: 'tir 20. okt',
      rsvpReminder: 'fre 30. okt',
      borrowDispenser: 'fre 30. okt',
      rsvpDeadline: 'lør 31. okt',
      // Program (Oct 2026): order the piñata about a week before
      orderPinata: 'lør 31. okt',
      allergyCheck: 'søn 1. nov',
      bakeCakeBase: 'ons 4. nov',
      partyReminder: 'tor 5. nov',
      checkGrill: 'tor 5. nov',
      // one shopping trip the day before (dry + fresh merged, 30 Oct 2026)
      shopForParty: 'fre 6. nov',
      bakeMuffins: 'fre 6. nov',
      // skattejakt for a 5-year-old: Ekaterina's drawn map, then hide the goodie bags on the day
      fillPinata: 'fre 6. nov',
      drawMap: 'fre 6. nov',
      hideTreasure: 'lør 7. nov',
      packBags: 'fre 6. nov',
      // Festdagen (Oct 2026): the jobs on the day itself, with a soft «ca. kl.» (rules/dayPrep.ts)
      dayActivities: 'lør 7. nov',
      'dayFood-grill': 'lør 7. nov',
      dayCake: 'lør 7. nov',
      partyDay: 'lør 7. nov',
      thanks: 'søn 8. nov',
    });
  });
  it('21 tickable tasks (one shopping trip, «Pakk godteposene», 3 jobs on the day), 1 done after setup', () => {
    const p = emma();
    const t = tickable(plan.tasks);
    expect(t).toHaveLength(21);
    expect(t.filter((x) => isDone(p, x))).toHaveLength(1);
    expect(progress(p, plan.tasks, '2026-10-19')).toMatchObject({ done: 1, total: 21, overdue: 0, thisWeekOpen: 2 });
  });
  it('is sorted by date', () => {
    const ds = plan.tasks.map((t) => t.date);
    expect([...ds].sort()).toEqual(ds);
  });
  it('the next task is sendInvite today', () => {
    const n = nextTask(emma(), plan.tasks, '2026-10-19');
    expect(n.task?.id).toBe('sendInvite');
    expect(n.when).toBe('I dag · mandag 19. oktober');
  });
});

describe('test vector B: planned Wed 28 Oct (avail 10)', () => {
  const p = emma({ plannedFrom: '2026-10-28' });
  it('R = 5 and the compressed front tasks', () => {
    expect(rsvpOffset(10)).toBe(5);
    const d = dates(p);
    expect(d.rsvpDeadline).toBe('man 2. nov');
    expect(d.sendInvite).toBe('ons 28. okt');
    expect(d.printCards).toBe('ons 28. okt');
    expect(d.orderPinata).toBe('lør 31. okt');
    expect(d.rsvpReminder).toBe('søn 1. nov');
    expect(d.borrowDispenser).toBe('søn 1. nov');
    expect(d.allergyCheck).toBe('tir 3. nov');
    expect(d.shopForParty).toBe('fre 6. nov');
    expect(d.bakeCakeBase).toBe('ons 4. nov');
    expect(d.partyDay).toBe('lør 7. nov');
  });
});

describe('test vector C: planned Sat 3 Oct (avail 35)', () => {
  const p = emma({ plannedFrom: '2026-10-03' });
  it('ideal offsets; nothing to do before Monday 19 October', () => {
    expect(dates(p).sendInvite).toBe('man 19. okt');
    const n = nextTask(p, buildTasks(p).tasks, '2026-10-03');
    expect(n.task?.id).toBe('sendInvite');
    expect(n.quiet).toBe('Ingenting å gjøre før mandag 19. oktober. Invitasjonen er klar når du vil.');
  });
});

describe('test vector D: planned Thu 5 Nov (avail 2)', () => {
  const p = emma({ plannedFrom: '2026-11-05' });
  const plan = buildTasks(p);
  it('R = 2, deadline today, buyPinata replaces orderPinata, nothing before today', () => {
    expect(plan.R).toBe(2);
    expect(plan.rsvpDeadline).toBe('2026-11-05');
    const ids = plan.tasks.map((t) => t.id);
    expect(ids).toContain('buyPinata');
    expect(ids).not.toContain('orderPinata');
    expect(plan.tasks.every((t) => t.date >= '2026-11-05')).toBe(true);
    const d = dates(p);
    expect(d.sendInvite).toBe('tor 5. nov');
    expect(d.printCards).toBe('tor 5. nov');
  });
});

describe('conditions', () => {
  it('a saftdispenser at home removes borrowDispenser', () => {
    const p = toggleHome(emma(), 'saftdispenser');
    expect(buildTasks(p).tasks.map((t) => t.id)).not.toContain('borrowDispenser');
  });
  it('buying the cake adds orderCake and drops the baking tasks', () => {
    const ids = buildTasks(emma({ cake: { mode: 'buy', cakeId: 'x', muffins: false } })).tasks.map((t) => t.id);
    expect(ids).toContain('orderCake');
    expect(ids).not.toContain('bakeCakeBase');
    expect(ids).not.toContain('bakeMuffins');
  });
  it('wienerpølser has no grill check; homemade pizza adds the dough task only when she makes the dough', () => {
    expect(buildTasks(emma({ menu: { kind: 'wienerpolser' } })).tasks.map((t) => t.id)).not.toContain('checkGrill');
    expect(buildTasks(emma({ menu: { kind: 'pizza', style: 'hjemmelaget' } })).tasks.map((t) => t.id)).not.toContain(
      'makeDough',
    );
    expect(
      buildTasks(emma({ menu: { kind: 'pizza', style: 'hjemmelaget', dough: 'selv' } })).tasks.map((t) => t.id),
    ).toContain('makeDough');
    // pølser + pizza: the grill check stays
    expect(
      buildTasks(
        emma({ menu: { kind: 'flere', dishes: [{ kind: 'grillpolser' }, { kind: 'pizza', style: 'hjemmelaget' }] } }),
      ).tasks.map((t) => t.id),
    ).toContain('checkGrill');
    expect(buildTasks(emma({ menu: { kind: 'pizza', style: 'bestilt' } })).tasks.map((t) => t.id)).toContain(
      'orderPizza',
    );
  });
  it('no piñata/skattejakt removes their tasks', () => {
    const ids = buildTasks(emma({ programme: { activities: [] } })).tasks.map((t) => t.id);
    expect(ids).not.toContain('orderPinata');
    expect(ids).not.toContain('drawMap');
    expect(ids).not.toContain('hideTreasure');
  });
});

describe('ticking and groups', () => {
  it('ticks are stored in taskState and counted', () => {
    const p = toggleTask(emma(), 'sendInvite', true, '2026-10-19T10:00:00Z');
    expect(p.taskState.sendInvite.done).toBe(true);
    expect(progress(p, buildTasks(p).tasks, '2026-10-19').done).toBe(2);
    expect(nextTask(p, buildTasks(p).tasks, '2026-10-19').task?.id).toBe('printCards');
  });
  it('groups into Denne uka / Neste uke / Festuka / Etter festen', () => {
    const p = emma();
    const g = groupTasks(p, buildTasks(p).tasks, '2026-10-19');
    expect(g.map((x) => x.title)).toEqual(['Denne uka', 'Neste uke', 'Festuka', 'Etter festen']);
    expect(g[0].tasks.map((t) => t.task.id)).toEqual(['guestList', 'sendInvite', 'printCards']);
    expect(g[3].tasks.map((t) => t.task.id)).toEqual(['thanks']);
  });
  it('undone tasks from earlier days move to «I dag» with «Skulle vært gjort …»', () => {
    const p = emma();
    const g = groupTasks(p, buildTasks(p).tasks, '2026-10-22');
    expect(g[0].title).toBe('I dag');
    expect(g[0].tasks.map((t) => t.task.id)).toEqual(['sendInvite', 'printCards']);
    expect(g[0].tasks[0].overdueText).toBe('Skulle vært gjort mandag 19.');
    expect(progress(p, buildTasks(p).tasks, '2026-10-22').overdue).toBe(2);
  });
});

describe('to-dos never depend on a theme', () => {
  it('without a theme the plan is the same; the piñata to-do is neutral', () => {
    const themed = buildTasks(emma());
    const plain = buildTasks(emma({ theme: null }));
    expect(plain.tasks.map((t) => t.id)).toEqual(themed.tasks.map((t) => t.id));
    expect(plain.tasks.find((t) => t.id === 'orderPinata')?.title).toBe('Bestill piñata');
    expect(themed.tasks.find((t) => t.id === 'orderPinata')?.title).toBe('Bestill enhjørning-piñata');
  });
  it('a themed piñata only when a theme is chosen AND the piñata is on', () => {
    const off = buildTasks(emma({ theme: 'frost', programme: { activities: [] } }));
    expect(off.tasks.map((t) => t.id)).not.toContain('orderPinata');
    expect(JSON.stringify(off.tasks)).not.toMatch(/piñata/i);
    const on = buildTasks(emma({ theme: 'frost' }));
    expect(on.tasks.find((t) => t.id === 'orderPinata')?.title).toBe('Bestill snøkrystall-piñata');
  });
});

describe('one shopping trip (Ekaterina, 30 Oct 2026: «why more work?»)', () => {
  it('one «Handle til festen» the day before, no «tørrvarer» / «ferskvarer» to-dos', () => {
    const tasks = buildTasks(emma({ menu: { kind: 'grillpolser' } })).tasks;
    expect(tasks.find((t) => t.id === 'buyDry' || t.id === 'buyFresh')).toBeUndefined();
    const shop = tasks.find((t) => t.id === 'shopForParty')!;
    expect(shop).toMatchObject({
      title: 'Handle til festen',
      date: '2026-11-06',
      link: { label: 'Handleliste', route: '/handleliste' },
    });
    expect(shop.detail).toContain('Bestiller du på nett? Velg gjerne levering dagen før.');
    expect(tasks.map((t) => t.title).join(' ')).not.toMatch(/tørrvarer|ferskvarer/i);
  });

  it('an old party: ticked only if BOTH old trips were ticked, hidden only if both were hidden', () => {
    const at = '2026-11-01T10:00:00.000Z';
    const later = '2026-11-06T10:00:00.000Z';
    expect(
      mergeShoppingTaskState({ buyDry: { done: true, doneAt: at }, buyFresh: { done: true, doneAt: later } }),
    ).toEqual({ shopForParty: { done: true, doneAt: later } });
    expect(mergeShoppingTaskState({ buyDry: { done: true, doneAt: at }, guestList: { done: true } })).toEqual({
      guestList: { done: true },
    });
    expect(
      mergeShoppingTaskState({ buyDry: { done: false, hidden: true }, buyFresh: { done: false, hidden: true } }),
    ).toEqual({ shopForParty: { done: false, hidden: true } });
    // already merged: kept as it is
    expect(mergeShoppingTaskState({ shopForParty: { done: false } })).toEqual({ shopForParty: { done: false } });
  });

  it('a saved party with both old trips ticked opens with «Handle til festen» ticked', () => {
    const old = { ...emma(), taskState: { buyDry: { done: true }, buyFresh: { done: true } } };
    const p = migrate(JSON.parse(JSON.stringify(old)))!;
    const shop = buildTasks(p).tasks.find((t) => t.id === 'shopForParty')!;
    expect(isDone(p, shop)).toBe(true);
    expect(p.taskState.buyDry).toBeUndefined();
  });
});
