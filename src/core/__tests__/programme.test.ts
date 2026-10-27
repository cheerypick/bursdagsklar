import { afterEach, describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import {
  ACTIVITIES,
  buildTasks,
  handleliste,
  homeItemsFor,
  migrate,
  moreIdeas,
  photoHuntItems,
  photoHuntText,
  pickedActivities,
  programmeShopLines,
  programmeTimeline,
  activityById,
  resolveActivity,
  sanitizeProgramme,
  suggestActivities,
  summarize,
  withActivity,
  type Party,
} from '..';
import { i18n } from '../../i18n/i18n';

afterEach(async () => {
  await i18n.changeLanguage('nb');
});

/** A party for `age`, at `place`, with nothing picked and a plain Toro cake (no muffins). */
function party(age: number, overrides: Partial<Party> = {}): Party {
  return emma({
    celebrants: [{ id: 'c1', name: 'Emma', age }],
    theme: null,
    home: { type: 'leilighet', garden: null },
    cake: { mode: 'bake', cakeId: 'toro-sjokoladekake-langpanne', muffins: false },
    programme: { activities: [] },
    ...overrides,
  });
}

const free = (ids: string[]) => ids.filter((id) => ACTIVITIES.find((a) => a.id === id)?.free);

describe('suggestions: three ideas for this party, always at least one free', () => {
  it('every age 3–10, every place, with and without a theme: 3 ideas, ≥1 free, all fit the age', () => {
    for (let age = 3; age <= 10; age++)
      for (const type of ['hus', 'leilighet', 'lokale', 'ute'] as const)
        for (const theme of [null, 'fotball', 'enhjorning'] as const)
          for (const date of ['2026-06-13', '2026-11-07']) {
            const p = party(age, { home: { type, garden: null }, theme, date, plannedFrom: '2026-05-01' });
            const s = suggestActivities(p);
            expect(s, `${age} ${type} ${theme} ${date}`).toHaveLength(3);
            expect(new Set(s).size).toBe(3);
            expect(free(s).length, `${age} ${type}`).toBeGreaterThanOrEqual(1);
            for (const id of s) {
              const a = activityById(id);
              expect(a.minAge <= age && a.maxAge >= age, `${id} for ${age}`).toBe(true);
            }
          }
  });
  it('the youngest get Ekaterina’s skattejakt with a map; 7+ the photo hunt', () => {
    expect(suggestActivities(party(4))[0]).toBe('skattejakt');
    expect(suggestActivities(party(8))[0]).toBe('fotojakt');
    // a joint party follows the youngest
    const joint = party(4, {
      celebrants: [
        { id: 'c1', name: 'Emma', age: 8 },
        { id: 'c2', name: 'Jonas', age: 4 },
      ],
    });
    expect(suggestActivities(joint)[0]).toBe('skattejakt');
  });
  it('muffins on Kake → «Pynt egne muffins»; otherwise the piñata', () => {
    expect(suggestActivities(party(5))).toContain('pinata');
    const muffins = party(5, { cake: { mode: 'bake', cakeId: 'x', muffins: false, kind: 'muffins' } });
    expect(suggestActivities(muffins)).toContain('pyntmuffins');
    expect(suggestActivities(muffins)).not.toContain('pinata');
  });
  it('a garden in summer → an outdoor game; in November or a flat → an indoor game', () => {
    const summer = party(8, { home: { type: 'hus', garden: true }, date: '2026-06-13', plannedFrom: '2026-05-01' });
    expect(suggestActivities(summer)[2]).toBe('boksengaar');
    const football = { ...summer, celebrants: [{ id: 'c1', name: 'Emma', age: 6 }], theme: 'fotball' as const };
    expect(suggestActivities(football)[2]).toBe('stafett');
    const november = { ...summer, date: '2026-11-07' };
    expect(activityById(suggestActivities(november)[2]).outdoor).toBe(false);
    expect(activityById(suggestActivities(party(8))[2]).outdoor).toBe(false);
  });
});

describe('«Flere ideer»', () => {
  it('a house or outdoors shows the Ute group; a flat does not', () => {
    expect(moreIdeas(party(7, { home: { type: 'hus', garden: true } })).map((g) => g.id)).toContain('ute');
    expect(moreIdeas(party(7, { home: { type: 'hus', garden: false } })).map((g) => g.id)).not.toContain('ute');
    expect(moreIdeas(party(7)).map((g) => g.id)).toEqual(['gratis', 'kjope']);
  });
  it('never repeats the three suggestions; ideas that fit the age come first', () => {
    const p = party(4, { home: { type: 'hus', garden: true } });
    const s = new Set(suggestActivities(p));
    const all = moreIdeas(p).flatMap((g) => g.activities);
    expect(all.filter((id) => s.has(id))).toEqual([]);
    const gratis = moreIdeas(p).find((g) => g.id === 'gratis')!.activities;
    // fotojakt (7–10) and kimslek (5–10) do not fit a 4-year-old: listed last, but still there
    expect(gratis.slice(-2).sort()).toEqual(['fotojakt', 'kimslek']);
  });
  it('«Pynt egne muffins» is only an idea when there are muffins', () => {
    const ids = (p: Party) => [...suggestActivities(p), ...moreIdeas(p).flatMap((g) => g.activities)];
    expect(ids(party(5))).not.toContain('pyntmuffins');
    expect(ids(party(5, { cake: { mode: 'bake', cakeId: 'x', muffins: true } }))).toContain('pyntmuffins');
  });
});

describe('the old switches → picked ideas (no schema bump)', () => {
  it('includeSkattejakt / includePinata become skattejakt / piñata', () => {
    expect(sanitizeProgramme({ includePinata: true, includeSkattejakt: true })).toEqual({
      activities: ['skattejakt', 'pinata'],
    });
    expect(sanitizeProgramme({ includePinata: false, includeSkattejakt: false })).toEqual({ activities: [] });
    expect(sanitizeProgramme(undefined)).toEqual({ activities: [] });
    expect(sanitizeProgramme({ activities: ['pinata', 'nope', 'pinata', 7] })).toEqual({ activities: ['pinata'] });
  });
  it('an old saved party opens with its ideas picked', () => {
    const old = { ...emma(), programme: { includePinata: true, includeSkattejakt: false } as Party['programme'] };
    const p = migrate(JSON.parse(JSON.stringify(old)))!;
    expect(p.programme).toEqual({ activities: ['pinata'] });
    expect(pickedActivities(p)).toEqual(['pinata']);
  });
  it('picking writes the new shape only', () => {
    const p = withActivity(emma({ programme: { includePinata: true, includeSkattejakt: true } }), 'fotojakt', true);
    expect(p.programme).toEqual({ activities: ['skattejakt', 'pinata', 'fotojakt'] });
    expect(withActivity(p, 'pinata', false).programme).toEqual({ activities: ['skattejakt', 'fotojakt'] });
  });
});

describe('Handleliste: only what the picked ideas need, never twice', () => {
  it('nothing picked → nothing extra', () => {
    expect(programmeShopLines(party(5))).toEqual([]);
    expect(handleliste(party(5)).groups.map((g) => g.id)).not.toContain('leker');
  });
  it('skattejakt and fotojakt need nothing (the goodie bags are on the list already)', () => {
    const p = party(8, { programme: { activities: ['skattejakt', 'fotojakt'] } });
    expect(programmeShopLines(p)).toEqual([]);
  });
  it('piñata: the theme piñata + candy to fill it, in «Til lekene»', () => {
    const p = party(5, { theme: 'enhjorning', programme: { activities: ['pinata'] } });
    const lines = programmeShopLines(p);
    expect(lines.map((l) => l.id)).toEqual(['program-pinata', 'program-pinataGodteri']);
    expect(lines[0].name).toBe('Enhjørning-piñata');
    const g = handleliste(p).groups.find((x) => x.id === 'leker')!;
    expect(g.title).toBe('Til lekene');
    expect(g.items.map((i) => i.id)).toEqual(['program-pinata', 'program-pinataGodteri']);
  });
  it('fiskedam: sheet and rod unless at home, and one small prize per child', () => {
    const p = party(4, { children: 10, programme: { activities: ['fiskedam'] } });
    expect(programmeShopLines(p).map((l) => l.id)).toEqual(['program-premier', 'laken-fiskedam', 'fiskestang']);
    expect(programmeShopLines(p)[0].qty).toContain('10');
    const home = { ...p, haveAtHome: ['laken-fiskedam' as const] };
    expect(programmeShopLines(home).map((l) => l.id)).toEqual(['program-premier', 'fiskestang']);
    // «Har dere dette hjemme?» asks about the sheet and rod for the fiskedam (no longer for skattejakt)
    expect(homeItemsFor(p)).toContain('fiskestang');
    expect(homeItemsFor(party(4, { programme: { activities: ['skattejakt'] } }))).not.toContain('fiskestang');
  });
  it('egg-og-skje-løp and muffin decorating add their own line, balloons are never added twice', () => {
    const p = party(6, {
      cake: { mode: 'bake', cakeId: 'x', muffins: true },
      programme: { activities: ['eggeskje', 'pyntmuffins', 'stoppdans'] },
    });
    const ids = handleliste(p).groups.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain('program-eggTilLop');
    expect(ids).toContain('program-muffinspynt');
    expect(ids.filter((id) => id.includes('ballong'))).toEqual(['ballonger']);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('to-dos for the picked ideas', () => {
  const ids = (p: Party) => buildTasks(p).tasks.map((t) => t.id);
  it('nothing picked → no activity to-dos', () => {
    const list = ids(party(5));
    for (const id of [
      'orderPinata',
      'buyPinata',
      'fillPinata',
      'drawMap',
      'hideTreasure',
      'printClues',
      'makePhotoList',
      'makeRod',
    ])
      expect(list).not.toContain(id);
  });
  it('skattejakt for the youngest: draw the map the day before, hide the bags on the day', () => {
    const p = party(5, { programme: { activities: ['skattejakt'] } });
    const tasks = buildTasks(p).tasks;
    expect(tasks.find((t) => t.id === 'drawMap')?.date).toBe('2026-11-06');
    expect(tasks.find((t) => t.id === 'hideTreasure')?.date).toBe('2026-11-07');
    expect(ids(p)).not.toContain('printClues');
  });
  it('skattejakt for 7+ keeps the old clue-note to-do (printClues)', () => {
    const p = party(8, { programme: { activities: ['skattejakt'] } });
    expect(ids(p)).toContain('printClues');
    expect(ids(p)).not.toContain('drawMap');
  });
  it('piñata: order about a week before, fill it the day before; fotojakt: make the list', () => {
    const p = party(8, { programme: { activities: ['pinata', 'fotojakt'] } });
    const tasks = buildTasks(p).tasks;
    expect(tasks.find((t) => t.id === 'orderPinata')?.date).toBe('2026-10-31');
    expect(tasks.find((t) => t.id === 'fillPinata')?.date).toBe('2026-11-06');
    expect(tasks.find((t) => t.id === 'makePhotoList')?.link?.route).toBe('/program');
  });
});

describe('the suggested order for the day', () => {
  it('12–14 with skattejakt and piñata: arrival → food → skattejakt → cake → piñata → … → home', () => {
    const p = party(5, { programme: { activities: ['pinata', 'skattejakt'] } });
    const tl = programmeTimeline(p);
    expect(tl.map((b) => b.id)).toEqual(['arrive', 'food', 'skattejakt', 'cake', 'pinata', 'play', 'home']);
    expect(tl[0].time).toBe('12.00');
    expect(tl[1].time).toBe('12.15');
    expect(tl[2].time).toBe('12.40');
    expect(tl[tl.length - 1].time).toBe('13.50');
  });
  it('too many ideas for the time: shortened in proportion, still ends on time', () => {
    const p = party(8, {
      start: '17:00',
      end: '18:30',
      programme: { activities: ['fotojakt', 'skattejakt', 'kimslek', 'stivheks', 'pinata'] },
    });
    const tl = programmeTimeline(p);
    expect(tl[tl.length - 1].time).toBe('18.20');
    const sum = tl.reduce((a, b) => a + b.minutes, 0);
    expect(sum).toBeLessThanOrEqual(90);
  });
  it('nothing picked: a free-play block, in English too', async () => {
    expect(programmeTimeline(party(5)).map((b) => b.id)).toEqual(['arrive', 'food', 'play', 'cake', 'home']);
    await i18n.changeLanguage('en');
    const tl = programmeTimeline(party(5));
    expect(tl[0].time).toBe('12:00');
    expect(tl[0].title).toMatch(/[A-Za-z]/);
  });
});

describe('summary, Planen and English', () => {
  it('programmeLine names the picks', () => {
    const p = party(5, { programme: { activities: ['skattejakt', 'pinata'] } });
    const s = summarize(p, '2026-10-20');
    expect(s.programmeLine).toBe('Program 12–14: Skattejakt, Piñata');
    expect(s.programmeChoice).toBe('Skattejakt, Piñata');
    expect(s.programmeCount).toBe(2);
    expect(summarize(party(5), '2026-10-20').programmeLine).toBe('Program 12–14');
  });
  it('the rules exist in both languages: 3–6 numbered steps for every activity', async () => {
    for (const lng of ['nb', 'en']) {
      await i18n.changeLanguage(lng);
      for (const a of ACTIVITIES) {
        const r = resolveActivity(a.id);
        expect(r.steps.length, `${lng} ${a.id}`).toBeGreaterThanOrEqual(3);
        expect(r.steps.length, `${lng} ${a.id}`).toBeLessThanOrEqual(6);
        expect(r.name).not.toMatch(/^program\./);
      }
    }
    await i18n.changeLanguage('en');
    const s = summarize(party(5, { programme: { activities: ['skattejakt', 'pinata'] } }), '2026-10-20');
    expect(s.programmeLine).toMatch(/^Programme 12:00–14:00: Treasure hunt, Piñata$/);
  });
  it('the photo hunt list: 10 items, themed when a theme is set, ready to share', () => {
    const plain = photoHuntItems(null);
    const themed = photoHuntItems('fotball');
    expect(plain).toHaveLength(10);
    expect(themed).toHaveLength(10);
    expect(themed.filter((x) => !plain.includes(x)).length).toBeGreaterThanOrEqual(3);
    const text = photoHuntText(themed, 'fotball');
    expect(text.split('\n').filter((l) => /^\d+\. /.test(l))).toHaveLength(10);
  });
});
