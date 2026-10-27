import { afterEach, describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import {
  cakeChoiceLine,
  cakePieces,
  cakePlan,
  cakeShopLines,
  handleliste,
  migrate,
  resolveCake,
  sanitizeCake,
  scratchRecipe,
  summarize,
  toroPacks,
  withCake,
  buildTasks,
  homeItemsFor,
  type Party,
} from '..';
import { i18n } from '../../i18n/i18n';

/** A party with `kids` children (birthday child included) and exactly `adults` adults eating. */
function party(kids: number, adults: number, cake: Partial<Party['cake']> = {}): Party {
  const p = emma();
  return {
    ...p,
    children: kids,
    hostAdults: adults,
    guests: [],
    // no helping parents and no expected staying adults: the adults are exactly the hosts
    invitation: { parentsHelp: false },
    celebrants: [{ ...p.celebrants[0], age: 9 }],
    cake: { mode: 'bake', cakeId: 'toro-sjokoladekake-langpanne', muffins: false, ...cake },
  };
}

afterEach(async () => {
  await i18n.changeLanguage('nb');
});

describe('pieces and packs (1,5 per child + 1 per adult; 24 per Toro pack)', () => {
  it('10 children + 2 adults → 17 pieces → 1 pack', () => {
    expect(cakePieces(10, 2)).toBe(17);
    expect(toroPacks(17)).toBe(1);
  });
  it('16 children + 4 adults → 28 pieces → 2 packs, with the hint', () => {
    expect(cakePieces(16, 4)).toBe(28);
    expect(toroPacks(28)).toBe(2);
  });
  it('rounds up, and one pack is the least', () => {
    expect(cakePieces(3, 1)).toBe(6); // 4,5 + 1 = 5,5 → 6
    expect(toroPacks(24)).toBe(1);
    expect(toroPacks(25)).toBe(2);
    expect(toroPacks(0)).toBe(1);
  });
  it('uses the same head-count as the food (stay estimate for younger guests)', () => {
    const p = party(10, 2);
    const plan = cakePlan(p);
    expect(plan.adults).toBeGreaterThanOrEqual(2);
    expect(plan.pieces).toBe(cakePieces(plan.kids, plan.adults));
  });
  it('the party head-count: 16 children + 4 adults → 2 langpanner and severalPacks', () => {
    const plan = cakePlan(party(16, 4));
    expect(plan.kids).toBe(16);
    expect(plan.adults).toBe(4);
    expect(plan).toMatchObject({
      kind: 'toro',
      pieces: 28,
      langpanner: 2,
      glazePacks: 2,
      muffinPacks: 0,
      severalPacks: true,
    });
  });
  it('«1 langpanne + muffins» instead of the second pack', () => {
    expect(cakePlan(party(16, 4, { muffins: true }))).toMatchObject({ langpanner: 1, muffinPacks: 1, glazePacks: 1 });
    // 40 children + 4 adults = 64 pieces → 3 packs, or 2 langpanner + 16 → 2 muffin packs
    expect(cakePlan(party(40, 4, { muffins: true }))).toMatchObject({ pieces: 64, langpanner: 2, muffinPacks: 2 });
  });
  it('muffins: 12 per pack; from scratch: one langpanne per 24', () => {
    expect(cakePlan(party(10, 2, { kind: 'muffins' }))).toMatchObject({ muffinPacks: 2, langpanner: 0, glazePacks: 0 });
    expect(cakePlan(party(16, 4, { kind: 'scratch' }))).toMatchObject({ langpanner: 2, glazePacks: 0 });
    expect(cakePlan(party(10, 2, { kind: 'buy', mode: 'buy' }))).toMatchObject({ langpanner: 0, muffinPacks: 0 });
  });
});

describe('shopping lines per choice', () => {
  const ids = (p: Party) => cakeShopLines(p).map((l) => l.id);
  it('Toro (default): mix, Kremet glaze and butter, gluten note', () => {
    const lines = cakeShopLines(party(10, 2));
    expect(lines.map((l) => l.text)).toEqual([
      '1 pk Toro Sjokoladekake Langpanne',
      '1 pk Toro Kremet Sjokoladeglasur',
      '250 g smør',
    ]);
    expect(lines[0].detail).toContain('Glutenfri ifølge Orkla – sjekk pakken');
    expect(lines[2].detail).toBe('250 g til kaken (eller 2,5 dl flytende margarin)');
  });
  it('Toro, two packs, the glaze to mix: margarine for the glaze', () => {
    const lines = cakeShopLines(party(16, 4, { glaze: 'langpanne' }));
    expect(lines.map((l) => l.text)).toEqual([
      '2 pk Toro Sjokoladekake Langpanne',
      '2 pk Toro Sjokoladeglasur til langpanne',
      '2 dl flytende margarin',
      '500 g smør',
    ]);
  });
  it('Toro + muffins: the muffins and their butter', () => {
    const lines = cakeShopLines(party(16, 4, { muffins: true, muffinFlavour: 'sjokolade' }));
    expect(lines.map((l) => l.text)).toEqual([
      '1 pk Toro Sjokoladekake Langpanne',
      '1 pk Toro Kremet Sjokoladeglasur',
      '1 pk Toro Sjokolademuffins',
      '350 g smør',
    ]);
  });
  it('Muffins only', () => {
    expect(cakeShopLines(party(10, 2, { kind: 'muffins' })).map((l) => l.text)).toEqual([
      '2 pk Toro Lyse Muffins',
      '200 g smør',
    ]);
  });
  it('From scratch: the TINE ingredients (cake + glaze), scaled by langpanner, each once', () => {
    const one = cakeShopLines(party(10, 2, { kind: 'scratch' }));
    const by = Object.fromEntries(one.map((l) => [l.id, l.text]));
    expect(by['kake-egg']).toBe('5 stk egg');
    expect(by['kake-kakao']).toBe('2,25 dl kakao'); // 1,5 dl in the cake + 0,75 dl in the glaze
    expect(by['kake-melis']).toBe('6 dl melis');
    expect(by['kake-smor']).toBe('325 g smør'); // 225 + 100
    const two = Object.fromEntries(cakeShopLines(party(16, 4, { kind: 'scratch' })).map((l) => [l.id, l.text]));
    expect(two['kake-egg']).toBe('10 stk egg');
    expect(two['kake-hvetemel']).toBe('9 dl hvetemel');
    expect(two['kake-smor']).toBe('650 g smør');
    expect(new Set(ids(party(16, 4, { kind: 'scratch' }))).size).toBe(ids(party(16, 4, { kind: 'scratch' })).length);
    expect(ids(party(16, 4, { kind: 'scratch' }))).not.toContain('kake-toro');
  });
  it('Ready-made: nothing to buy here (the to-do «Bestill kaken» instead)', () => {
    const p = party(10, 2, { kind: 'buy', mode: 'buy' });
    expect(cakeShopLines(p)).toEqual([]);
    const order = buildTasks(p).tasks.find((x) => x.id === 'orderCake');
    expect(order).toMatchObject({
      title: 'Bestill kaken',
      detail: 'Ca. 17 biter. For eksempel på REMA 1000 eller hos et bakeri',
    });
    expect(buildTasks(p).tasks.map((x) => x.id)).not.toContain('bakeCakeBase');
  });
  it('Handleliste: the cake lines once, in «Til kaken»; the candles stay in «Fest og pynt»', () => {
    const list = handleliste(withCake(party(10, 2), { kind: 'toro', chosen: true }));
    const kake = list.groups.find((g) => g.id === 'kake')!;
    expect(kake.title).toBe('Til kaken');
    expect(kake.items.map((i) => i.id)).toEqual(['kake-toro', 'kake-glasur', 'kake-smor']);
    const all = list.groups.flatMap((g) => g.items.map((i) => i.id));
    expect(all.filter((id) => id === 'kakelys')).toHaveLength(1);
    expect(new Set(all).size).toBe(all.length);
    expect(handleliste(party(10, 2, { kind: 'buy', mode: 'buy' })).groups.some((g) => g.id === 'kake')).toBe(false);
  });
  it('muffins only: no «Bak kakebunnen», a muffins to-do, and the muffin cups at home', () => {
    const p = party(10, 2, { kind: 'muffins' });
    const tasks = buildTasks(p).tasks;
    expect(tasks.map((x) => x.id)).not.toContain('bakeCakeBase');
    expect(tasks.find((x) => x.id === 'bakeMuffins')?.title).toBe('Bak og pynt muffinsene');
    expect(homeItemsFor(p)).toContain('muffinsformer');
    expect(homeItemsFor(party(10, 2))).not.toContain('muffinsformer');
  });
});

describe('the recipe from scratch (TINE)', () => {
  it('one langpanne, and doubled for two', () => {
    const r = scratchRecipe(1);
    expect(r.url).toBe('https://www.tine.no/oppskrifter/kaker/krem-og-sjokoladekaker/Sjokoladekake-i-langpanne');
    expect(r.cake.map((i) => `${i.amount} ${i.name}`)).toEqual([
      '225 g Smør',
      '5 stk Egg',
      '4 dl Sukker',
      '0,75 dl Rapsolje',
      '0,75 dl Melk',
      '4,5 dl Hvetemel',
      '1,5 dl Kakao',
      '1 ss Bakepulver',
    ]);
    expect(r.glaze.map((i) => i.amount)).toEqual(['100 g', '1 dl', '0,75 dl', '1,5 ss', '6 dl', '2 dl']);
    expect(scratchRecipe(2).cake[0].amount).toBe('450 g');
    expect(r.steps[r.steps.length - 1]).toContain('ca. 25 minutter');
  });
});

describe('names in nb and en', () => {
  it('Planen line and done state', () => {
    expect(cakeChoiceLine(party(10, 2))).toBe('Toro sjokoladekake med glasur');
    expect(cakeChoiceLine(party(16, 4, { muffins: true }))).toBe('Toro sjokoladekake og muffins');
    expect(cakeChoiceLine(party(10, 2, { kind: 'scratch' }))).toBe('Sjokoladekake fra bunnen');
    const s = summarize(withCake(party(10, 2), { kind: 'muffins', chosen: true }), '2026-10-27');
    expect(s.cakeChoice).toBe('Toro-muffins');
    expect(s.cakeChosen).toBe(true);
    expect(summarize(party(10, 2), '2026-10-27').cakeChosen).toBe(false);
  });
  it('English', async () => {
    await i18n.changeLanguage('en');
    expect(cakeChoiceLine(party(10, 2))).toBe('Toro chocolate cake with frosting');
    const lines = cakeShopLines(party(10, 2));
    expect(lines.map((l) => l.text)).toEqual([
      '1 pack Toro Sjokoladekake Langpanne',
      '1 pack Toro Kremet Sjokoladeglasur',
      '250 g butter',
    ]);
    expect(lines[0].detail).toContain('Gluten-free according to Orkla – check the pack');
    expect(scratchRecipe(1).cake[3]).toMatchObject({ amount: '0.75 dl', name: 'Rapeseed oil' });
    expect(scratchRecipe(1).cake[7].amount).toBe('1 tbsp');
    const order = buildTasks(party(10, 2, { kind: 'buy', mode: 'buy' })).tasks.find((x) => x.id === 'orderCake');
    expect(order?.detail).toBe('About 17 pieces. For example at REMA 1000 or a bakery');
    expect(handleliste(party(10, 2)).groups.find((g) => g.id === 'kake')?.title).toBe('For the cake');
  });
});

describe('older parties (no schema bump)', () => {
  it('a party saved with the old vanilje/sjokolade cakeId opens as the Toro default, not chosen', () => {
    for (const cakeId of ['vaniljekake-langpanne', 'sjokoladekake-langpanne']) {
      const old = { ...emma(), cake: { mode: 'bake', cakeId, muffins: false } };
      const p = migrate(JSON.parse(JSON.stringify(old)))!;
      expect(p).not.toBeNull();
      expect(p.schemaVersion).toBe(6);
      expect(p.cake).toEqual({ mode: 'bake', cakeId, muffins: false });
      expect(resolveCake(p.cake)).toEqual({
        kind: 'toro',
        glaze: 'kremet',
        muffinFlavour: 'lyse',
        muffins: false,
        chosen: false,
      });
      expect(cakeShopLines(p).map((l) => l.id)).toEqual(['kake-toro', 'kake-glasur', 'kake-smor']);
    }
  });
  it('old mode «buy» opens as «Kjøpe ferdig»; old muffins stay muffins', () => {
    const p = migrate({ ...emma(), cake: { mode: 'buy', cakeId: 'x', muffins: false } })!;
    expect(resolveCake(p.cake).kind).toBe('buy');
    expect(resolveCake(emma().cake)).toMatchObject({ kind: 'toro', muffins: true });
  });
  it('a broken or missing cake still opens', () => {
    expect(sanitizeCake(undefined)).toEqual({ mode: 'bake', cakeId: 'toro-sjokoladekake-langpanne', muffins: false });
    expect(sanitizeCake({ mode: 'x', kind: 'kransekake', glaze: 3, chosen: 'yes' })).toEqual({
      mode: 'bake',
      cakeId: 'toro-sjokoladekake-langpanne',
      muffins: false,
    });
    const { cake: _c, ...noCake } = emma();
    void _c;
    expect(migrate(noCake)?.cake.mode).toBe('bake');
  });
  it('withCake keeps mode and cakeId in step with the kind', () => {
    const p = withCake(party(10, 2), { kind: 'buy' });
    expect(p.cake).toMatchObject({ kind: 'buy', mode: 'buy', cakeId: 'kjopt-kake' });
    expect(withCake(p, { kind: 'scratch', chosen: true }).cake).toMatchObject({ mode: 'bake', chosen: true });
  });
});
