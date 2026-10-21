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

describe('sausages (spec §6.4, recalibrated 21 Oct 2026)', () => {
  // Emma: 13 children (5 år: 2 each) + 4 adults (1,5 each) = 32 eaten, + 2 extra = 34
  it('grill: 34 → 4 pk Gilde à 10 = 40; lomper and pølsebrød half each: 20 → 2 pk à 10, 20 → 3 pk à 8', () => {
    expect(sausages('grillpolser', P)).toMatchObject({
      eaten: 32,
      need: 34,
      packs: 4,
      bought: 40,
      lomperNeed: 20,
      lomper: 20,
      lomperPacks: 2,
      buns: 20,
      bunPacks: 3,
      bunsBought: 24,
      condiments: 1,
      onionBags: 2,
    });
  });
  it('wiener: 34 → 5 pk Gilde à 8 = 40, lomper 20, pølsebrød 20 → 3 pk', () => {
    expect(sausages('wienerpolser', P)).toMatchObject({
      need: 34,
      packs: 5,
      bought: 40,
      lomper: 20,
      buns: 20,
      bunPacks: 3,
    });
  });
  it('wiener with 0 adults: 26 + 2 = 28 → 4 pk = 32; 16 lomper → 2 pk, 16 pølsebrød → 2 pk', () => {
    expect(sausages('wienerpolser', { ...P, adultsEating: 0 })).toMatchObject({
      need: 28,
      packs: 4,
      bought: 32,
      lomper: 20,
      buns: 16,
      bunPacks: 2,
    });
  });
  it('11 children: 22 + 6 + 2 = 30 → 3 pk; pølsebrød 15 → 2 pk', () => {
    expect(sausages('grillpolser', { ...P, kidsComing: 11 })).toMatchObject({
      need: 30,
      packs: 3,
      buns: 15,
      bunPacks: 2,
    });
  });
  it('sanity check, a real party with 15 children (~40 eaten): 40 pølser, bread ≈ the pølser', () => {
    const s = sausages('grillpolser', { kidsComing: 15, adultsEating: 5, age: 5 });
    expect(s).toMatchObject({ eaten: 38, packs: 4, bought: 40, condiments: 1, onionBags: 2 });
    expect(s.lomper + s.bunsBought).toBeGreaterThanOrEqual(s.bought);
    expect(s.lomper + s.bunsBought).toBeLessThanOrEqual(s.bought + 8);
  });
  it('lomper left out: one pølsebrød per sausage, not half', () => {
    expect(sausages('grillpolser', P, { withLomper: false })).toMatchObject({ buns: 40, bunPacks: 5, bunsBought: 40 });
  });
  it('pølsebrød left out: one lompe per sausage', () => {
    expect(sausages('grillpolser', P, { withPolsebrod: false })).toMatchObject({ lomperNeed: 40, lomperPacks: 4 });
  });
  it('the pack sizes are the real Oda packs', () => {
    expect(SAUSAGE_PACK).toEqual({ grillpolser: 10, wienerpolser: 8 });
    expect(LOMPER_PACK).toBe(10);
    expect(POLSEBROD_PACK).toBe(8);
  });
  it('one child who eats no pork → 3 kyllingpølser', () => {
    expect(extraSausagesFor('grillpolser', 1, 5)).toBe(3);
  });
});

describe('pizza (spec §6.5)', () => {
  it('45 units for Emma', () => expect(pizzaUnits(P)).toBe(45));
  it('frossen 6, bestilt vanlig 6, bestilt stor 4, hjemmelaget 3 langpanner', () => {
    expect(pizzaCount(45, 'frossen')).toBe(6);
    expect(pizzaCount(45, 'bestilt', '30')).toBe(6);
    expect(pizzaCount(45, 'bestilt', '40')).toBe(4);
    expect(pizzaCount(45, 'hjemmelaget')).toBe(3);
  });
  it('homemade ×3: flour, yeast, sauce, cheese, ham', () => {
    expect(homemadePizza(3)).toMatchObject({
      squares: 72,
      flourDl: 24,
      flourPacks: 2,
      yeastG: 75,
      yeastPacks: 2,
      waterDl: 9,
      oilSs: 6,
      saltTs: 3,
      sauceDl: 7.5,
      sauceJars: 3,
      cheeseG: 900,
      cheesePacks: 3,
      hamG: 450,
      hamPacks: 3,
    });
  });
  it('sanity: 15 guests + birthday child aged 8, 2 adults → 57 units, 5 large or 8 regular', () => {
    const u = pizzaUnits({ kidsComing: 16, adultsEating: 2, age: 8 });
    expect(u).toBe(57);
    expect(pizzaCount(u, 'bestilt', '40')).toBe(5);
    expect(pizzaCount(u, 'bestilt', '30')).toBe(8);
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
  it('has no candy: it belongs to the goodie bags (godteposer), a later PR', () => {
    const e = extras(P, { muffins: true });
    expect(Object.keys(e).some((k) => /candy/i.test(k))).toBe(false);
  });
});

describe('shopping list for Emma (spec §6.9)', () => {
  it('grill menu lines', () => {
    const list = shoppingList(emma());
    const by = Object.fromEntries(list.map((i) => [i.id, i]));
    expect(by.grillpolser).toMatchObject({ need: 34, packs: 4, display: '40 (4 pk à 10)' });
    expect(by.lomper).toMatchObject({ packs: 2 });
    expect(by.ketchup).toMatchObject({ name: 'Ketchup og sennep', display: '1 av hver' });
    expect(by.lok).toMatchObject({ name: 'Sprøstekt løk', display: '2 poser' });
    expect(by.polsebrod).toMatchObject({ packs: 3 });
    expect(by.saft.packs).toBe(2);
  });
  it('RSVPs: Nora (nøtter) and Adam (ikke svin) → +3 kyllingpølser, and no candy line', () => {
    const g = (id: string, label: string, allergies: Guest['allergies']): Guest => ({
      id,
      label,
      status: 'yes',
      adultsStaying: 0,
      allergies,
    });
    const list = shoppingList(emma({ guests: [g('1', 'Nora', ['notter']), g('2', 'Adam', ['ikke-svin'])] }));
    const by = Object.fromEntries(list.map((i) => [i.id, i]));
    expect(by.kyllingpolser.need).toBe(3);
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
