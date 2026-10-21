import { describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import {
  clampFoodCounts,
  dietLines,
  foodCardSummary,
  foodCounts,
  foodPlan,
  menuCardOf,
  menuTitle,
  partyFoodPlan,
  type FoodPlan,
} from '../rules/menu';
import { guestBounds, toggleDiet, withFoodItem, withGuestCounts, withMenu } from '../party';
import { buildTasks } from '../rules/todos';
import { headCount } from '../rules/people';
import type { MenuChoice } from '../model';

const line = (plan: FoodPlan, id: string) => {
  for (const s of plan.sections) for (const l of s.lines) if (l.id === id) return l;
  throw new Error(`no line ${id}`);
};
const emmaPlan = (
  menu: MenuChoice,
  counts = { kids: 13, adults: 4 },
  diets: Parameters<typeof foodPlan>[0]['diets'] = [],
) => foodPlan({ menu, counts, age: 5, diets, celebrants: 1 });

describe('Mat for Emma: 13 children, 4 adults (spec §6.9)', () => {
  it('the fixture counts 13 children and 4 adults', () => {
    expect(foodCounts(emma())).toEqual({ kids: 13, adults: 4 });
  });

  it('grillpølser: 46 → 5 pk à 10, with the reason in words', () => {
    const plan = emmaPlan({ kind: 'grillpolser' });
    expect(plan.title).toBe('Grillpølser');
    expect(plan.forWhom).toBe('for 13 barn og 4 voksne');
    expect(line(plan, 'grillpolser')).toEqual({
      id: 'grillpolser',
      name: 'Grillpølser',
      amount: '50 stk',
      packs: '5 pk à 10',
      why: 'ca. 2 per barn og 2 per voksen + 35 % ekstra = 46, rundet opp til hele pakker',
      toggleable: true,
      included: true,
    });
    expect(line(plan, 'lomper')).toMatchObject({ amount: '50 stk', packs: '5 pk à 10', why: 'Én til hver pølse' });
    expect(line(plan, 'polsebrod')).toMatchObject({ amount: '24 stk', packs: '3 pk à 8' });
    expect(line(plan, 'ketchup').amount).toBe('1 av hver');
  });

  it('drinks, fruit and the cake note (no candy: it goes in the goodie bags later)', () => {
    const plan = emmaPlan({ kind: 'grillpolser' });
    expect(plan.sections.map((s) => s.id)).toEqual(['main', 'drikke', 'snacks', 'kake']);
    expect(line(plan, 'saft')).toMatchObject({ amount: '2 flasker saft' });
    expect(line(plan, 'saft').why).toBe(
      'ca. 5 dl per barn og 6 dl per voksen = ca. 8,9 liter. Juice i stedet: ca. 8,9 liter',
    );
    expect(line(plan, 'vann').amount).toBe('ca. 4 liter'); // 17 × 2 dl = 3,4 → 4
    expect(line(plan, 'frukt').amount).toBe('ca. 2,3 kg');
    expect(() => line(plan, 'godteri')).toThrow();
    expect(plan.sections.find((s) => s.id === 'snacks')!.lines.map((l) => l.id)).toEqual(['frukt']);
    expect(line(plan, 'kake')).toMatchObject({ amount: 'ca. 19 biter' });
    expect(line(plan, 'kake').why).toContain('Kake senere');
  });

  it('wienerpølser: 43 → 6 pk à 8 = 48', () => {
    expect(line(emmaPlan({ kind: 'wienerpolser' }), 'wienerpolser')).toMatchObject({
      amount: '48 stk',
      packs: '6 pk à 8',
    });
  });

  it('pizza: frossen 6 stk (3 runder à 15 min); hjemmelaget 3 langpanner', () => {
    const f = emmaPlan({ kind: 'pizza', style: 'frossen' });
    expect(line(f, 'frossenpizza')).toMatchObject({ amount: '6 stk' });
    expect(line(f, 'frossenpizza').why).toContain('= 45 stykker');
    expect(line(f, 'ovnstid')).toMatchObject({ amount: 'ca. 45 min' });
    const h = emmaPlan({ kind: 'pizza', style: 'hjemmelaget' });
    expect(h.title).toBe('Hjemmelaget pizza');
    expect(line(h, 'langpanner').amount).toBe('3 langpanner');
    expect(line(h, 'hvetemel')).toMatchObject({ amount: 'ca. 1,5 kg', packs: '2 pk à 1 kg' });
    expect(line(h, 'gjaer')).toMatchObject({ amount: '75 g', packs: '2 pk à 50 g' });
    expect(line(h, 'pizzaost')).toMatchObject({ packs: '3 pk à 350 g' });
  });

  it('taco: kjøttdeig 6 pk, tortillas 6 pk à 8', () => {
    const t = emmaPlan({ kind: 'taco' });
    expect(line(t, 'kjottdeig')).toMatchObject({ amount: 'ca. 2,2 kg', packs: '6 pk à 400 g' });
    expect(line(t, 'tortillas')).toMatchObject({ amount: '48 stk', packs: '6 pk à 8' });
    expect(line(t, 'tacokrydder').amount).toBe('3 poser');
  });

  it('pastasalat and pasta med saus', () => {
    const s = emmaPlan({ kind: 'pasta', style: 'salat' });
    expect(s.title).toBe('Pastasalat');
    // (13 × 60 + 4 × 90) × 1,2 = 1368 g → 3 pk à 500 g
    expect(line(s, 'pasta')).toMatchObject({ amount: 'ca. 1,5 kg', packs: '3 pk à 500 g' });
    expect(line(s, 'pastaskinke')).toMatchObject({ amount: '600 g', packs: '4 pk à 150 g' });
    expect(line(s, 'pastagront').amount).toBe('3 av hver');
    expect(line(s, 'dressing').amount).toBe('2 flasker');
    const v = emmaPlan({ kind: 'pasta', style: 'varm' });
    expect(line(v, 'pastasaus').amount).toBe('4 glass'); // (13 + 4 × 1,5) / 6 = 3,2 → 4
    expect(line(v, 'pastaost').amount).toBe('2 poser');
  });

  it('«Noe annet»: the dish is hers; only drinks, snacks and cake are calculated', () => {
    const plan = emmaPlan({ kind: 'annet', text: 'Kyllingsuppe' });
    expect(plan.title).toBe('Kyllingsuppe');
    const main = plan.sections.find((s) => s.id === 'main')!;
    expect(main.lines).toHaveLength(1);
    expect(main.lines[0]).toMatchObject({ name: 'Kyllingsuppe', amount: 'Din egen' });
    expect(line(plan, 'saft').amount).toBe('2 flasker saft');
  });
});

describe('a joint party with mixed ages', () => {
  // Ali (4) and Sara (8): 14 invited + 2 birthday children; portions follow the OLDEST (8, band C)
  const joint = emma({
    celebrants: [
      { id: 'c1', name: 'Ali', age: 4 },
      { id: 'c2', name: 'Sara', age: 8 },
    ],
    kidsInvited: 14,
  });
  it('counts both birthday children and uses the oldest child’s portions', () => {
    const hc = headCount(joint);
    expect(hc.kidsComing).toBe(16);
    const plan = partyFoodPlan(joint)!;
    const adults = hc.adultsEating;
    // band C: 2,5 per child; (16 × 2,5 + adults × 2) × 1,35
    const need = Math.ceil((16 * 2.5 + adults * 2) * 1.35 - 1e-9);
    expect(line(plan, 'grillpolser').why).toContain('ca. 2,5 per barn');
    expect(line(plan, 'grillpolser').why).toContain(`= ${need},`);
    expect(line(plan, 'grillpolser').packs).toBe(`${Math.ceil(need / 10)} pk à 10`);
    expect(line(plan, 'kake').why).toContain('Ett lys-sett per bursdagsbarn');
  });
  it('a 4-year-old alone would get 1,5 per child', () => {
    const plan = partyFoodPlan(emma({ celebrants: [{ id: 'c1', name: 'Ali', age: 4 }], kidsInvited: 14 }))!;
    expect(line(plan, 'grillpolser').why).toContain('ca. 1,5 per barn');
  });
});

describe('rounding to pack sizes', () => {
  it('never rounds down, and float noise does not add a pack', () => {
    // (13 × 2 + 4 × 2) × 1,35 = 45,9 → 46 → 5 pk
    expect(line(emmaPlan({ kind: 'grillpolser' }), 'grillpolser').packs).toBe('5 pk à 10');
    // exactly 50 needed stays 5 pk: (20 × 2 + 0) × 1,25 = 50 → wiener 7 pk à 8 = 56
    expect(line(emmaPlan({ kind: 'wienerpolser' }, { kids: 20, adults: 0 }), 'wienerpolser')).toMatchObject({
      amount: '56 stk',
      packs: '7 pk à 8',
    });
    // one child, no adults: 2 × 1,35 = 2,7 → 3 → still a whole pack
    expect(line(emmaPlan({ kind: 'grillpolser' }, { kids: 1, adults: 0 }), 'grillpolser')).toMatchObject({
      amount: '10 stk',
      packs: '1 pk à 10',
    });
  });
  it('no adults: the reason line leaves them out', () => {
    expect(line(emmaPlan({ kind: 'grillpolser' }, { kids: 10, adults: 0 }), 'grillpolser').why).toBe(
      'ca. 2 per barn + 35 % ekstra = 27, rundet opp til hele pakker',
    );
  });
  it('more children → more packs: 20 children, 4 adults = 65 → 7 pk', () => {
    expect(line(emmaPlan({ kind: 'grillpolser' }, { kids: 20, adults: 4 }), 'grillpolser')).toMatchObject({
      amount: '70 stk',
      packs: '7 pk à 10',
    });
  });
  it('the steppers are clamped', () => {
    expect(clampFoodCounts({ kids: 0, adults: -2 })).toEqual({ kids: 1, adults: 0 });
    expect(clampFoodCounts({ kids: 99, adults: 99 })).toEqual({ kids: 45, adults: 30 });
  });
});

describe('dietary chips', () => {
  it('each chip adds one note line with an extra portion, in a fixed order', () => {
    const plan = emmaPlan({ kind: 'grillpolser' }, undefined, ['ingen-svin', 'glutenfri']);
    const h = plan.sections.find((s) => s.id === 'hensyn')!;
    expect(plan.sections.map((s) => s.id)).toEqual(['main', 'hensyn', 'drikke', 'snacks', 'kake']);
    expect(h.lines.map((l) => l.name)).toEqual(['Glutenfri', 'Ingen svin']);
    expect(h.lines[1]).toMatchObject({ amount: '1 pk kyllingpølser' });
  });
  it('every chip has a text for every dish, and none of them promises anything medical', () => {
    const menus: MenuChoice[] = [
      { kind: 'grillpolser' },
      { kind: 'pizza', style: 'hjemmelaget' },
      { kind: 'pizza', style: 'frossen' },
      { kind: 'taco' },
      { kind: 'pasta', style: 'salat' },
      { kind: 'pasta', style: 'varm' },
      { kind: 'annet', text: 'Suppe' },
    ];
    for (const m of menus) {
      const lines = dietLines(m, ['glutenfri', 'laktosefri', 'vegetar', 'ingen-svin']);
      expect(lines).toHaveLength(4);
      for (const l of lines) {
        expect(l.amount.length).toBeGreaterThan(3);
        expect(l.why.length).toBeGreaterThan(3);
        expect(`${l.amount} ${l.why}`).not.toMatch(/trygg|sikker|allergivennlig|garanti/i);
      }
    }
  });
});

describe('the party record', () => {
  it('a menu is null until picked; withMenu / toggleDiet update it', () => {
    let p = emma({ menu: null });
    expect(partyFoodPlan(p)).toBeNull();
    expect(foodCardSummary(p)).toBeNull();
    p = withMenu(p, { kind: 'grillpolser' });
    expect(foodCardSummary(p)).toEqual({
      title: 'Grillpølser',
      line: '50 grillpølser med lomper og pølsebrød · 2 flasker saft · for 13 barn og 4 voksne',
    });
    p = toggleDiet(p, 'vegetar');
    expect(p.diets).toEqual(['vegetar']);
    expect(toggleDiet(p, 'vegetar').diets).toEqual([]);
  });
});

describe("item toggles (deselect what you don't need)", () => {
  const grill = () => emma({ menu: { kind: 'grillpolser' } });
  it('every quantity line in main, drinks and fruit is toggleable and starts included', () => {
    const plan = partyFoodPlan(grill())!;
    for (const s of plan.sections) {
      for (const l of s.lines) {
        expect(l.included, l.id).toBe(true);
        expect(l.toggleable, l.id).toBe(['main', 'drikke', 'snacks'].includes(s.id));
      }
    }
    // «Din egen» and the frozen pizza's oven time are not things to buy
    expect(line(partyFoodPlan(emma({ menu: { kind: 'annet', text: 'Suppe' } }))!, 'egen').toggleable).toBe(false);
    expect(line(partyFoodPlan(emma({ menu: { kind: 'pizza', style: 'frossen' } }))!, 'ovnstid').toggleable).toBe(false);
  });
  it('deselecting pølsebrød stores included: false, keeps the line (greyed) and can be undone', () => {
    let p = withFoodItem(grill(), 'polsebrod', false);
    expect(p.foodItems).toEqual({ polsebrod: { included: false } });
    const l = line(partyFoodPlan(p)!, 'polsebrod');
    expect(l).toMatchObject({ included: false, toggleable: true, amount: '24 stk' });
    expect(line(partyFoodPlan(p)!, 'lomper').included).toBe(true);
    p = withFoodItem(p, 'polsebrod', true);
    expect(p.foodItems).toEqual({ polsebrod: { included: true } });
    expect(line(partyFoodPlan(p)!, 'polsebrod').included).toBe(true);
  });
  it('the Mat card on Planen leaves out deselected lines', () => {
    let p = withFoodItem(grill(), 'polsebrod', false);
    expect(foodCardSummary(p)!.line).toBe('50 grillpølser med lomper · 2 flasker saft · for 13 barn og 4 voksne');
    p = withFoodItem(p, 'lomper', false);
    expect(foodCardSummary(p)!.line).toBe('50 grillpølser · 2 flasker saft · for 13 barn og 4 voksne');
    p = withFoodItem(withFoodItem(p, 'saft', false), 'grillpolser', false);
    expect(foodCardSummary(p)!.line).toBe('for 13 barn og 4 voksne');
  });
  it('the state is kept per line id when switching dish and back', () => {
    let p = withFoodItem(grill(), 'polsebrod', false);
    p = withMenu(p, { kind: 'taco' });
    expect(line(partyFoodPlan(p)!, 'saft').included).toBe(true);
    p = withMenu(p, { kind: 'grillpolser' });
    expect(line(partyFoodPlan(p)!, 'polsebrod').included).toBe(false);
  });
  it('the shopping to-do skips a deselected item', () => {
    const detail = (p: ReturnType<typeof emma>) => buildTasks(p).tasks.find((t) => t.id === 'buyDry')?.detail;
    expect(detail(grill())).toBe('Lomper og saft');
    expect(detail(withFoodItem(grill(), 'lomper', false))).toBe('Pølsebrød og saft');
    expect(detail(emma({ menu: null }))).toBe('Saft');
  });
});

describe('guest count: one source of truth (the party)', () => {
  it("the food always follows the party's head-count", () => {
    const hc = headCount(emma());
    expect(foodCounts(emma())).toEqual({ kids: hc.kidsComing, adults: hc.adultsEating });
    expect(partyFoodPlan(emma({ menu: { kind: 'grillpolser' } }))!.forWhom).toBe('for 13 barn og 4 voksne');
  });
  it("changing the invited children changes the party, the food, Planen's numbers and the to-dos", () => {
    const before = emma({ menu: { kind: 'grillpolser' } });
    const p = withGuestCounts(before, { kidsInvited: 14 });
    expect(p.kidsInvited).toBe(14);
    expect(headCount(p).kidsComing).toBe(15);
    expect(foodCounts(p).kids).toBe(15);
    expect(foodCardSummary(p)!.line).toContain('for 15 barn');
    expect(line(partyFoodPlan(p)!, 'grillpolser').amount).not.toBe(line(partyFoodPlan(before)!, 'grillpolser').amount);
    // the party-wide reminder that counts the goodie bags follows too
    const fill = (q: typeof p) => buildTasks(q).tasks.find((t) => t.id === 'bakeMuffins')?.detail ?? '';
    expect(fill(before)).toContain('13 godteposer');
    expect(fill(p)).toContain('15 godteposer');
  });
  it('changing the adults sets hostAdults so the adults eating is exactly the number asked for', () => {
    const p0 = emma();
    const b = guestBounds(p0);
    expect(b.adultsMin).toBe(headCount(p0).adultsEating - p0.hostAdults);
    const p = withGuestCounts(p0, { adults: 7 });
    expect(headCount(p).adultsEating).toBe(7);
    expect(foodCounts(p).adults).toBe(7);
    expect(p.hostAdults).toBe(p0.hostAdults + 3);
    // clamped: never below the parents who are expected to stay, never negative host adults
    const low = withGuestCounts(p0, { adults: 0 });
    expect(low.hostAdults).toBe(0);
    expect(headCount(low).adultsEating).toBe(b.adultsMin);
  });
  it('the invited children stay inside 1–40', () => {
    expect(withGuestCounts(emma(), { kidsInvited: 0 }).kidsInvited).toBe(1);
    expect(withGuestCounts(emma(), { kidsInvited: 99 }).kidsInvited).toBe(40);
  });
  it('card ids and titles', () => {
    expect(menuCardOf({ kind: 'wienerpolser' })).toBe('polser');
    expect(menuCardOf(null)).toBeNull();
    expect(menuTitle({ kind: 'annet', text: '  ' })).toBe('Egen hovedrett');
    expect(withMenu(emma(), { kind: 'annet', text: 'x'.repeat(80) }).menu).toEqual({
      kind: 'annet',
      text: 'x'.repeat(60),
    });
  });
});
