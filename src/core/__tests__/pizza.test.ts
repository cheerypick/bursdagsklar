import { describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import {
  HIDDEN_MENU_CARDS,
  VISIBLE_MENU_CARDS,
  menuDishes,
  menuFromDishes,
  withDishOn,
  withoutHiddenDishes,
} from '../rules/dishes';
import { foodCardSummary, isMainSection, menuTitle, partyFoodPlan, type FoodPlan } from '../rules/menu';
import { sausages, shoppingList } from '../rules/food';
import { migrate } from '../storage/PartyRepository';
import { withMenu } from '../party';
import type { Dish, MenuChoice, Party } from '../model';

const line = (plan: FoodPlan, id: string) => {
  for (const s of plan.sections) for (const l of s.lines) if (l.id === id) return l;
  throw new Error(`no line ${id}`);
};
const has = (plan: FoodPlan, id: string) => plan.sections.some((s) => s.lines.some((l) => l.id === id));
const PIZZA: Dish = { kind: 'pizza', style: 'hjemmelaget' };
const BOTH: MenuChoice = { kind: 'flere', dishes: [{ kind: 'grillpolser' }, PIZZA] };
const planFor = (menu: MenuChoice, extra: Partial<Party> = {}) => partyFoodPlan(emma({ menu, ...extra }))!;

describe('homemade pizza for Emma (13 barn, 4 voksne, 5 år)', () => {
  it('38 biter → 4 langpanner, with the computation in plain words', () => {
    const plan = planFor(PIZZA);
    expect(plan.title).toBe('Hjemmelaget pizza');
    expect(line(plan, 'langpanner')).toMatchObject({
      name: 'Pizza',
      amount: '4 langpanner',
      why: '13 barn × 2 + 4 voksne × 3 = 38 biter. 12 biter per langpanne',
    });
  });
  it('default: ferdig pizzadeig 4 pk, 2 glass pizzasaus, 2 poser revet ost, skinke 2 pk', () => {
    const plan = planFor(PIZZA);
    expect(plan.sections[0].lines.map((l) => l.id)).toEqual([
      'langpanner',
      'pizzadeig',
      'pizzasaus',
      'pizzaost',
      'pizzaskinke',
    ]);
    expect(line(plan, 'pizzadeig')).toMatchObject({ name: 'Ferdig pizzadeig', amount: '4 pk' });
    expect(line(plan, 'pizzadeig').why).toContain('Peppes Pizzabunn original 550 g');
    expect(line(plan, 'pizzadeig').why).toContain('REMA 1000 Fersk stor pizzabunn 550 g');
    expect(line(plan, 'pizzasaus')).toMatchObject({ amount: '2 glass' });
    expect(line(plan, 'pizzasaus').why).toContain('Mutti');
    expect(line(plan, 'pizzaost')).toMatchObject({ amount: '2 poser', packs: 'à 400 g' });
    expect(line(plan, 'pizzaskinke')).toMatchObject({ name: 'Skinke', amount: '2 pk' });
    // no hvetemel or gjær unless she makes the dough herself
    expect(has(plan, 'hvetemel')).toBe(false);
    expect(has(plan, 'gjaer')).toBe(false);
  });
  it('the other bases: ferdigstekte bunner, pizzamiks, lag deigen selv', () => {
    const rounds = planFor({ ...PIZZA, dough: 'ferdigstekt' });
    expect(line(rounds, 'langpanner')).toMatchObject({ name: 'Pizza', amount: '8 bunner' });
    expect(line(rounds, 'pizzabunner')).toMatchObject({ amount: '4 pk', packs: 'à 2 bunner' });
    expect(line(rounds, 'pizzasaus').why).toContain('per 2 bunner');
    const mix = planFor({ ...PIZZA, dough: 'miks' });
    expect(line(mix, 'pizzamiks')).toMatchObject({ amount: '4 pk' });
    expect(line(mix, 'pizzamiks').why).toContain('Toro Pizzabunn Familiepakke 370 g');
    const self = planFor({ ...PIZZA, dough: 'selv' });
    expect(line(self, 'hvetemel').packs).toBe('2 pk à 1 kg');
    expect(line(self, 'gjaer').packs).toBe('2 pk à 50 g');
  });
  it('7–10 år: 3 biter per barn', () => {
    const p = emma({ menu: PIZZA, celebrants: [{ id: 'c1', name: 'Emma', age: 8 }] });
    expect(line(partyFoodPlan(p)!, 'langpanner').why).toBe(
      '13 barn × 3 + 2 voksne × 3 = 45 biter. 12 biter per langpanne',
    );
    // at 8 år no parents stay, so only the 2 hosts eat
    expect(line(partyFoodPlan(p)!, 'langpanner').amount).toBe('4 langpanner');
  });
  it('frozen pizza is still there as the other choice', () => {
    expect(line(planFor({ kind: 'pizza', style: 'frossen' }), 'frossenpizza').amount).toBe('5 stk');
  });
});

describe('topping chips', () => {
  it('each chip adds one line with a real pack, and taking it off removes the line', () => {
    const all = planFor({
      ...PIZZA,
      toppings: ['skinke', 'pepperoni', 'sopp', 'ananas', 'mais', 'paprika', 'kebab', 'rommedressing'],
    });
    expect(line(all, 'pepperoni')).toMatchObject({ amount: '4 pk' });
    expect(line(all, 'pepperoni').why).toContain('Grilstad Pepperoni 100 g');
    expect(line(all, 'sopp').amount).toBe('4 bokser');
    expect(line(all, 'ananas').amount).toBe('4 bokser');
    expect(line(all, 'mais').amount).toBe('2 bokser');
    expect(line(all, 'paprika').amount).toBe('4 stk');
    expect(line(all, 'kebab').amount).toBe('2 pk');
    expect(line(all, 'rommedressing').amount).toBe('2 flasker'); // 17 people, one per ca. 15
    const pepperoniOnly = planFor({ ...PIZZA, toppings: ['pepperoni'] });
    expect(has(pepperoniOnly, 'pepperoni')).toBe(true);
    expect(has(pepperoniOnly, 'pizzaskinke')).toBe(false);
    const none = planFor({ ...PIZZA, toppings: [] });
    expect(none.sections[0].lines.map((l) => l.id)).toEqual(['langpanner', 'pizzadeig', 'pizzasaus', 'pizzaost']);
  });
  it('the shopping list follows the chips (same ids)', () => {
    const ids = shoppingList(emma({ menu: { ...PIZZA, toppings: ['pepperoni', 'mais'] } })).map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['pizzadeig', 'pizzasaus', 'pizzaost', 'pepperoni', 'mais']));
    expect(ids).not.toContain('pizzaskinke');
  });
});

describe('glutenfri', () => {
  it('the glutenfri chip adds a Brisk glutenfri pizzabunn for the gluten-free guests', () => {
    const plan = planFor(PIZZA, { diets: ['glutenfri'] });
    expect(line(plan, 'diet-glutenfri')).toMatchObject({ amount: '1 Brisk Glutenfri pizzabunn 300 g' });
    expect(line(plan, 'diet-glutenfri').why).toContain('Norgesmøllene');
  });
  it('with pølser and pizza, one line per dish', () => {
    const plan = planFor(BOTH, { diets: ['glutenfri'] });
    expect(line(plan, 'diet-glutenfri')).toMatchObject({ name: 'Glutenfri, pølser' });
    expect(line(plan, 'diet-glutenfri-pizza-hjemmelaget')).toMatchObject({
      name: 'Glutenfri, pizza',
      amount: '1 Brisk Glutenfri pizzabunn 300 g',
    });
  });
});

describe('pølser and pizza together', () => {
  it('both sections show, and each covers about half of the portions', () => {
    const plan = planFor(BOTH);
    expect(plan.title).toBe('Grillpølser og hjemmelaget pizza');
    expect(plan.sections.filter((s) => isMainSection(s.id)).map((s) => s.id)).toEqual(['main-polser', 'main-pizza']);
    // pizza: half of 38 = 19 biter → 2 langpanner (24 biter)
    expect(line(plan, 'langpanner')).toMatchObject({
      amount: '2 langpanner',
      why: 'Halvparten pølser, halvparten pizza: 13 barn × 2 + 4 voksne × 3 = 38 biter, halvparten er 19. 12 biter per langpanne',
    });
    expect(line(plan, 'pizzadeig').amount).toBe('2 pk');
    expect(line(plan, 'pizzasaus').amount).toBe('1 glass');
    expect(line(plan, 'pizzaost').amount).toBe('1 pose');
    expect(line(plan, 'pizzaskinke').amount).toBe('1 pk');
    // pølser: half of the sausage rule (13 × 3 + 4 × 2 = 47 → 24), up to whole packs: 3 pk à 10 = 30 (alone: 50)
    const full = sausages('grillpolser', { kidsComing: 13, adultsEating: 4, age: 5 });
    const half = sausages('grillpolser', { kidsComing: 13, adultsEating: 4, age: 5, share: 0.5 });
    expect(full.bought).toBe(50);
    expect(half.need).toBe(24);
    expect(line(plan, 'grillpolser')).toMatchObject({
      amount: '30 stk',
      packs: '3 pk à 10',
      why: 'Halvparten pølser, halvparten pizza. 13 barn × 3 + 4 voksne × 2 = 47, halvparten er 24. 3 pk Gilde Grillpølser à 10 = 30, eller 1 storpakning (3 × 10)',
    });
    // the bread follows the 30 sausages
    expect(line(plan, 'lomper').amount).toBe(`${half.lomper} stk`);
    expect(line(plan, 'polsebrod').amount).toBe(`${half.bunsBought} stk`);
  });
  it('«Noe annet» can come on top without halving anything', () => {
    const plan = planFor({ kind: 'flere', dishes: [PIZZA, { kind: 'annet', text: 'Vårruller' }] });
    expect(line(plan, 'langpanner').amount).toBe('4 langpanner');
    expect(line(plan, 'egen')).toMatchObject({ name: 'Vårruller', amount: 'Din egen' });
    expect(menuTitle({ kind: 'flere', dishes: [PIZZA, { kind: 'annet', text: 'Vårruller' }] })).toBe(
      'Hjemmelaget pizza og vårruller',
    );
  });
  it('the Mat card on Planen names both', () => {
    expect(foodCardSummary(emma({ menu: BOTH }))!.line).toMatch(
      /^\d+ grillpølser med lomper og pølsebrød \+ 2 langpanner pizza · /,
    );
  });
  it('the shopping list has both, with the halved amounts', () => {
    const list = shoppingList(emma({ menu: BOTH }));
    const half = sausages('grillpolser', { kidsComing: 13, adultsEating: 4, age: 5, share: 0.5 });
    expect(list.find((i) => i.id === 'grillpolser')!.packs).toBe(half.packs);
    expect(list.find((i) => i.id === 'pizzadeig')!.packs).toBe(2);
  });
  it('one dish per card: picking and unpicking cards keeps the others', () => {
    let m = withDishOn(null, 'polser', { kind: 'grillpolser' });
    m = withDishOn(m, 'pizza', PIZZA);
    expect(menuDishes(m).map((d) => d.kind)).toEqual(['grillpolser', 'pizza']);
    m = withDishOn(m, 'polser', { kind: 'wienerpolser' });
    expect(menuDishes(m).map((d) => d.kind)).toEqual(['wienerpolser', 'pizza']);
    m = withDishOn(m, 'polser', null);
    expect(m).toEqual(PIZZA); // one dish is stored as before
    expect(withDishOn(m, 'pizza', null)).toBeNull();
    expect(menuFromDishes([PIZZA, { kind: 'grillpolser' }])).toEqual(BOTH); // card order
  });
});

describe('taco and pasta are hidden for now', () => {
  it('the Mat screen shows Pølser, Pizza and Noe annet', () => {
    expect(VISIBLE_MENU_CARDS).toEqual(['polser', 'pizza', 'annet']);
    expect(HIDDEN_MENU_CARDS).toEqual(['taco', 'pasta']);
  });
  it('old saved data with taco or pasta opens with nothing picked, and does not crash', () => {
    const base = { ...emma(), menu: null };
    expect(migrate({ ...base, menu: { kind: 'taco' } })!.menu).toBeNull();
    expect(migrate({ ...base, menu: { kind: 'pasta', style: 'salat' } })!.menu).toBeNull();
    expect(partyFoodPlan(migrate({ ...base, menu: { kind: 'pasta', style: 'varm' } })!)).toBeNull();
    // mixed with a visible dish: only the hidden one goes
    expect(
      migrate({ ...base, menu: { kind: 'flere', dishes: [{ kind: 'taco' }, { kind: 'grillpolser' }] } })!.menu,
    ).toEqual({
      kind: 'grillpolser',
    });
    // malformed menus become «not chosen»
    expect(withoutHiddenDishes({ kind: 'flere' })).toBeNull();
    expect(withoutHiddenDishes('taco')).toBeNull();
    expect(withoutHiddenDishes({ kind: 'nope' })).toBeNull();
  });
  it('their rules are kept, so they can come back (e.g. for older children)', () => {
    expect(line(planFor({ kind: 'taco' }), 'kjottdeig').packs).toBe('6 pk à 400 g');
  });
  it('withMenu keeps «Noe annet» at 60 characters, also when combined', () => {
    const p = withMenu(emma(), { kind: 'flere', dishes: [PIZZA, { kind: 'annet', text: 'x'.repeat(80) }] });
    const annet = menuDishes(p.menu).find((d) => d.kind === 'annet');
    expect(annet && annet.kind === 'annet' && annet.text.length).toBe(60);
  });
});
