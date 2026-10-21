import { describe, expect, it } from 'vitest';
import { EMMA_PEOPLE, emma } from '../__fixtures__/emma';
import {
  customDish,
  extras,
  extraSausagesFor,
  homemadePizza,
  pizzaCount,
  pizzaUnits,
  sausages,
  shoppingList,
  taco,
} from '../rules/food';
import { headCount } from '../rules/people';
import { ceilSafe, LOMPER_PACK, POLSEBROD_PACK, SAUSAGE_PACK } from '../rules/constants';
import { partyFoodPlan } from '../rules/menu';
import type { Guest, Party } from '../model';

const P = EMMA_PEOPLE;

describe('head-count (spec §4.1)', () => {
  it('Emma: 13 kids coming, 4 adults eating', () => {
    expect(headCount(emma())).toMatchObject({ kidsComing: 13, adultsEating: 4, pendingCount: 12 });
  });
  it('two «Kommer ikke» → 11 kids, still 4 adults', () => {
    const no = (i: number): Guest => ({
      id: `g${i}`,
      label: `Barn ${i}`,
      status: 'no',
      adultsStaying: 0,
      allergies: [],
    });
    expect(headCount(emma({ guests: [no(1), no(2)] }))).toMatchObject({ kidsComing: 11, adultsEating: 4 });
  });
});

describe('ceilSafe', () => {
  it('ignores float noise but never rounds down', () => {
    expect(ceilSafe((13 * 2 + 4 * 2) * 1.35)).toBe(46);
    expect(ceilSafe(45.000000000001)).toBe(45);
    expect(ceilSafe(45.01)).toBe(46);
  });
});

describe('sausages (spec §6.4, her amounts 21 Oct 2026)', () => {
  // Emma: 13 children × 3 + 4 adults × 2 = 47 → up to whole packs
  it('grill: 47 → 5 pk Gilde à 10 = 50; both breads ca. 60 % each: 30 lomper (3 pk à 10), 32 pølsebrød (4 pk à 8)', () => {
    expect(sausages('grillpolser', P)).toMatchObject({
      raw: 47,
      need: 47,
      packs: 5,
      bought: 50,
      share: 30,
      lomperNeed: 30,
      lomper: 30,
      lomperPacks: 3,
      buns: 30,
      bunPacks: 4,
      bunsBought: 32,
      condiments: 1,
      onionBags: 2,
    });
  });
  it('wiener: 47 → 6 pk Gilde à 8 = 48; 29 of each bread → 3 pk lomper, 4 pk pølsebrød', () => {
    expect(sausages('wienerpolser', P)).toMatchObject({
      need: 47,
      packs: 6,
      bought: 48,
      share: 29,
      lomper: 30,
      buns: 29,
      bunPacks: 4,
      bunsBought: 32,
    });
  });
  it('wiener with 0 adults: 13 × 3 = 39 → 5 pk = 40; 24 of each bread → 3 pk lomper, 3 pk pølsebrød', () => {
    expect(sausages('wienerpolser', { ...P, adultsEating: 0 })).toMatchObject({
      need: 39,
      packs: 5,
      bought: 40,
      lomper: 30,
      buns: 24,
      bunPacks: 3,
    });
  });
  it('10 children: 30 + 8 = 38 → 4 pk = 40; pølsebrød 24 → 3 pk', () => {
    expect(sausages('grillpolser', { ...P, kidsComing: 10 })).toMatchObject({
      need: 38,
      packs: 4,
      buns: 24,
      bunPacks: 3,
    });
  });
  it('the same at every age 3–10: 3 per child', () => {
    for (const age of [3, 4, 5, 6, 7, 8, 9, 10]) expect(sausages('grillpolser', { ...P, age }).need).toBe(47);
  });
  it('her real party, 15 children and 5 adults: 45 + 10 = 55 → 6 pk = 60, what she bought', () => {
    const s = sausages('grillpolser', { kidsComing: 15, adultsEating: 5, age: 5 });
    expect(s).toMatchObject({ need: 55, packs: 6, bought: 60, condiments: 1, onionBags: 2 });
    // both breads: more bread than sausages, so nobody has to eat it the «wrong» way
    expect(s.lomper + s.bunsBought).toBeGreaterThan(s.bought);
  });
  it('lomper left out: one pølsebrød per sausage', () => {
    expect(sausages('grillpolser', P, { withLomper: false })).toMatchObject({ buns: 50, bunPacks: 7, bunsBought: 56 });
  });
  it('pølsebrød left out: one lompe per sausage', () => {
    expect(sausages('grillpolser', P, { withPolsebrod: false })).toMatchObject({ lomperNeed: 50, lomperPacks: 5 });
  });
  it('the pack sizes are the real Oda packs', () => {
    expect(SAUSAGE_PACK).toEqual({ grillpolser: 10, wienerpolser: 8 });
    expect(LOMPER_PACK).toBe(10);
    expect(POLSEBROD_PACK).toBe(8);
  });
  it('one child who eats no pork → 4 kyllingpølser (3, plus one to spare)', () => {
    expect(extraSausagesFor('grillpolser', 1, 5)).toBe(4);
  });
});

describe('pizza (spec §6.5, reworked 21 Oct 2026)', () => {
  it('38 pieces for Emma: 13 × 2 + 4 × 3, no extra percentage', () => expect(pizzaUnits(P)).toBe(38));
  it('frossen 5, bestilt vanlig 5, bestilt stor 3, hjemmelaget 4 langpanner (12 biter each)', () => {
    expect(pizzaCount(38, 'frossen')).toBe(5);
    expect(pizzaCount(38, 'bestilt', '30')).toBe(5);
    expect(pizzaCount(38, 'bestilt', '40')).toBe(3);
    expect(pizzaCount(38, 'hjemmelaget')).toBe(4);
  });
  it('homemade ×4, default (ferdig pizzadeig, skinke): 4 pk deig, 2 glass saus, 2 poser ost, 2 pk skinke', () => {
    expect(homemadePizza(4, { eaters: 17 })).toMatchObject({
      dough: 'ferdigdeig',
      doughPacks: 4,
      sauceJars: 2,
      cheeseG: 800,
      cheeseBags: 2,
      toppings: [{ id: 'skinke', packs: 2 }],
    });
  });
  it('lag deigen selv ×3: flour and yeast', () => {
    expect(homemadePizza(3, { dough: 'selv' })).toMatchObject({
      flourDl: 24,
      flourPacks: 2,
      yeastG: 75,
      yeastPacks: 2,
    });
  });
  it('7–10 år: 3 pieces per child, following the oldest birthday child', () => {
    const u = pizzaUnits({ kidsComing: 16, adultsEating: 2, age: 8 });
    expect(u).toBe(16 * 3 + 2 * 3);
    expect(pizzaCount(u, 'hjemmelaget')).toBe(5);
  });
});

describe('taco and egen meny (spec §6.6)', () => {
  it('taco: kjøttdeig 6 pk, tortillas 6 pk, ost 2 pk, krydder 3, sides 3', () => {
    expect(taco(P)).toMatchObject({
      meatG: 2113,
      meatPacks: 6,
      tortillas: 45,
      tortillaPacks: 6,
      cheeseG: 688,
      cheesePacks: 2,
      spiceBags: 3,
      mais: 3,
      romme: 3,
      tacosaus: 3,
    });
  });
  it('Kyllingklubber: 48 stk → 4 pk à 12', () => {
    expect(
      customDish(
        { kind: 'egen', name: 'Kyllingklubber', unit: 'stk', perChild: 2, perAdult: 3, bufferPct: 25, packSize: 12 },
        P,
      ),
    ).toEqual({ need: 48, packs: 4 });
  });
});

describe('extras (spec §6.7)', () => {
  it('saft 8,9 l → 2 bottles; fruit ca. 2,3 kg; 1 cake; 12 muffins; 6 candles; 13 bags', () => {
    expect(extras(P, { muffins: true })).toMatchObject({
      saftLitres: 8.9,
      saftBottles: 2,
      fruitG: 2250,
      fruitDisplay: 'ca. 2,3 kg',
      cakePieces: 19,
      cakeBatches: 1,
      muffins: 12,
      candles: 6,
      goodyBags: 13,
    });
  });
  it('has no candy: it belongs to the goodie bags (godteposer), on Handleliste', () => {
    const e = extras(P, { muffins: true });
    expect(Object.keys(e).some((k) => /candy/i.test(k))).toBe(false);
  });
});

describe('shopping list for Emma (spec §6.9)', () => {
  it('grill menu lines', () => {
    const list = shoppingList(emma());
    const by = Object.fromEntries(list.map((i) => [i.id, i]));
    expect(by.grillpolser).toMatchObject({ need: 47, packs: 5, display: '50 (5 pk à 10)' });
    expect(by.lomper).toMatchObject({ packs: 3, display: '30 (3 pk à 10)' });
    expect(by.ketchup).toMatchObject({ name: 'Ketchup og sennep', display: '1 av hver' });
    expect(by.lok).toMatchObject({ name: 'Sprøstekt løk', display: '2 poser' });
    expect(by.polsebrod).toMatchObject({ packs: 4, display: '32 (4 pk à 8)' });
    expect(by.saft.packs).toBe(2);
  });
  it('RSVPs: Nora (nøtter) and Adam (ikke svin) → +4 kyllingpølser, and no candy line', () => {
    const g = (id: string, label: string, allergies: Guest['allergies']): Guest => ({
      id,
      label,
      status: 'yes',
      adultsStaying: 0,
      allergies,
    });
    const list = shoppingList(emma({ guests: [g('1', 'Nora', ['notter']), g('2', 'Adam', ['ikke-svin'])] }));
    const by = Object.fromEntries(list.map((i) => [i.id, i]));
    expect(by.kyllingpolser.need).toBe(4);
    expect(by.godteri).toBeUndefined();
  });
  it('a line deselected on the Mat screen (included: false) is left off the list, the rest stay', () => {
    const list = shoppingList(emma({ foodItems: { polsebrod: { included: false }, lomper: { included: true } } }));
    const ids = list.map((i) => i.id);
    expect(ids).not.toContain('polsebrod');
    expect(ids).toContain('lomper');
    expect(ids).toContain('grillpolser');
  });
  it('Mat lines and shopping items share ids, so a toggle on one reaches the other', () => {
    const menus: Party['menu'][] = [
      { kind: 'grillpolser' },
      { kind: 'pizza', style: 'hjemmelaget' },
      { kind: 'pizza', style: 'frossen' },
      { kind: 'taco' },
      { kind: 'pasta', style: 'salat' },
      { kind: 'pasta', style: 'varm' },
    ];
    for (const menu of menus) {
      const p = emma({ menu });
      const matIds = new Set(partyFoodPlan(p)!.sections.flatMap((s) => s.lines.map((l) => l.id)));
      const shopFood = shoppingList(p).filter(
        (i) => i.ruleRef.startsWith('menu.') || i.id === 'saft' || i.id === 'frukt',
      );
      for (const i of shopFood) expect(matIds, `${menu?.kind} ${i.id}`).toContain(i.id);
    }
  });
  it('a «har dette hjemme» tick removes the line', () => {
    const list = shoppingList(emma({ haveAtHome: ['kakelys', 'ballonger'] }));
    expect(list.map((i) => i.id)).not.toContain('kakelys');
    expect(list.map((i) => i.id)).not.toContain('ballonger');
  });
  it('no menu chosen: only drinks, fruit and the party things (no candy)', () => {
    const ids = shoppingList(emma({ menu: null })).map((i) => i.id);
    expect(ids).not.toContain('godteri');
    expect(ids).toContain('saft');
    expect(ids).toContain('frukt');
    expect(ids).not.toContain('grillpolser');
    expect(ids).not.toContain('lomper');
  });
});
