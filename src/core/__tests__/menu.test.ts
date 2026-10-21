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

  it('grillpølser: 13 × 3 + 4 × 2 = 47 → 5 pk Gilde à 10 = 50, with the reason in words', () => {
    const plan = emmaPlan({ kind: 'grillpolser' });
    expect(plan.title).toBe('Grillpølser');
    expect(plan.forWhom).toBe('for 13 barn og 4 voksne');
    expect(line(plan, 'grillpolser')).toEqual({
      id: 'grillpolser',
      name: 'Grillpølser',
      amount: '50 stk',
      packs: '5 pk à 10',
      why: '13 barn × 3 + 4 voksne × 2 = 47. 5 pk Gilde Grillpølser à 10 = 50, eller 1 storpakning (3 × 10) og 2 pk',
      toggleable: true,
      included: true,
    });
    // both breads on: ca. 60 % each (30 lomper → 3 pk à 10, 30 pølsebrød → 4 pk à 8), said in words
    expect(line(plan, 'lomper')).toMatchObject({
      amount: '30 stk',
      packs: '3 pk à 10',
      why: 'Ca. 30 av hver – noen vil ha lompe, noen brød. Tar du bort det ene, dekker det andre alle pølsene',
    });
    expect(line(plan, 'polsebrod')).toMatchObject({
      amount: '32 stk',
      packs: '4 pk à 8',
      why: 'Ca. 30 av hver – noen vil ha lompe, noen brød',
    });
    expect(line(plan, 'ketchup')).toMatchObject({
      name: 'Ketchup og sennep',
      amount: '1 av hver',
      why: 'Til 17 personer. Én flaske av hver holder til ca. 25',
    });
    expect(line(plan, 'lok')).toMatchObject({
      name: 'Sprøstekt løk',
      amount: '2 poser',
      why: 'Til 17 personer. Én pose (100 g) holder til ca. 10',
    });
  });

  it('lomper left out: pølsebrød for every sausage', () => {
    const plan = foodPlan({
      menu: { kind: 'grillpolser' },
      counts: { kids: 13, adults: 4 },
      age: 5,
      diets: [],
      celebrants: 1,
      items: { lomper: { included: false } },
    });
    // the greyed lomper line shows what it comes back as: ca. 30
    expect(line(plan, 'lomper')).toMatchObject({ included: false, amount: '30 stk' });
    expect(line(plan, 'polsebrod')).toMatchObject({
      included: true,
      amount: '56 stk',
      packs: '7 pk à 8',
      why: 'Uten lomper: ett pølsebrød per pølse',
    });
  });

  it('pølsebrød left out: one lompe per sausage', () => {
    const plan = foodPlan({
      menu: { kind: 'grillpolser' },
      counts: { kids: 13, adults: 4 },
      age: 5,
      diets: [],
      celebrants: 1,
      items: { polsebrod: { included: false } },
    });
    expect(line(plan, 'lomper')).toMatchObject({
      amount: '50 stk',
      packs: '5 pk à 10',
      why: 'Uten pølsebrød: én lompe per pølse',
    });
  });

  it('32 people: 2 ketchup, 2 sennep, 4 bags of løk', () => {
    const plan = emmaPlan({ kind: 'grillpolser' }, { kids: 26, adults: 6 });
    expect(line(plan, 'ketchup')).toMatchObject({
      amount: '2 av hver',
      why: 'Til 32 personer. Én flaske av hver holder til ca. 25',
    });
    expect(line(plan, 'lok')).toMatchObject({
      amount: '4 poser',
      why: 'Til 32 personer. Én pose (100 g) holder til ca. 10',
    });
  });

  it('drinks, fruit and the cake note (no candy: it goes in the goodie bags later)', () => {
    const plan = emmaPlan({ kind: 'grillpolser' });
    expect(plan.sections.map((s) => s.id)).toEqual(['main-polser', 'drikke', 'snacks', 'kake']);
    expect(line(plan, 'saft')).toMatchObject({ amount: '2 flasker saft' });
    expect(line(plan, 'saft').why).toBe(
      'ca. 5 dl per barn og 6 dl per voksen = ca. 8,9 liter. Jus i stedet: ca. 8,9 liter',
    );
    expect(line(plan, 'vann').amount).toBe('ca. 4 liter'); // 17 × 2 dl = 3,4 → 4
    expect(line(plan, 'frukt').amount).toBe('ca. 2,3 kg');
    expect(() => line(plan, 'godteri')).toThrow();
    expect(plan.sections.find((s) => s.id === 'snacks')!.lines.map((l) => l.id)).toEqual(['frukt']);
    expect(line(plan, 'kake')).toMatchObject({ amount: 'ca. 19 biter' });
    expect(line(plan, 'kake').why).toContain('Kake senere');
  });

  it('wienerpølser: 47 → 6 pk Gilde à 8 = 48, same per-person rule', () => {
    expect(line(emmaPlan({ kind: 'wienerpolser' }), 'wienerpolser')).toMatchObject({
      amount: '48 stk',
      packs: '6 pk à 8',
      why: '13 barn × 3 + 4 voksne × 2 = 47. 6 pk Gilde Wienerpølse à 8 = 48',
    });
  });

  it('pizza: frossen 5 stk (3 runder à 15 min); hjemmelaget 4 langpanner', () => {
    const f = emmaPlan({ kind: 'pizza', style: 'frossen' });
    expect(line(f, 'frossenpizza')).toMatchObject({ amount: '5 stk' });
    expect(line(f, 'frossenpizza').why).toBe('13 barn × 2 + 4 voksne × 3 = 38 biter. Ca. 8 biter per pizza');
    expect(line(f, 'ovnstid')).toMatchObject({ amount: 'ca. 45 min' });
    const h = emmaPlan({ kind: 'pizza', style: 'hjemmelaget', dough: 'selv' });
    expect(h.title).toBe('Hjemmelaget pizza');
    expect(line(h, 'langpanner').amount).toBe('4 langpanner');
    expect(line(h, 'hvetemel')).toMatchObject({ amount: 'ca. 2 kg', packs: '2 pk à 1 kg' });
    expect(line(h, 'gjaer')).toMatchObject({ amount: '100 g', packs: '2 pk à 50 g' });
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
    const main = plan.sections.find((s) => s.id === 'main-annet')!;
    expect(main.lines).toHaveLength(1);
    expect(main.lines[0]).toMatchObject({ name: 'Kyllingsuppe', amount: 'Din egen' });
    expect(line(plan, 'saft').amount).toBe('2 flasker saft');
  });
});

describe('a joint party with mixed ages', () => {
  // Ali (4) and Sara (8): 16 children in total (14 guests + the 2 birthday children); portions follow the OLDEST (8, band C)
  const joint = emma({
    celebrants: [
      { id: 'c1', name: 'Ali', age: 4 },
      { id: 'c2', name: 'Sara', age: 8 },
    ],
    children: 16,
  });
  it('takes the total as is (both birthday children included) and uses the oldest child’s portions', () => {
    const hc = headCount(joint);
    expect(hc.kidsComing).toBe(16);
    const plan = partyFoodPlan(joint)!;
    const adults = hc.adultsEating;
    // 3 per child at every age, 2 per adult
    const need = 16 * 3 + adults * 2;
    expect(line(plan, 'grillpolser').why).toContain(`16 barn × 3 + ${adults} voksne × 2 = ${need}.`);
    expect(line(plan, 'grillpolser').packs).toBe(`${Math.ceil(need / 10)} pk à 10`);
    expect(line(plan, 'kake').why).toContain('Ett lys-sett per bursdagsbarn');
  });
  it('a 4-year-old gets the same 3 per child', () => {
    const plan = partyFoodPlan(emma({ celebrants: [{ id: 'c1', name: 'Ali', age: 4 }], children: 15 }))!;
    expect(line(plan, 'grillpolser').why).toContain('15 barn × 3');
  });
});

describe('rounding to pack sizes', () => {
  it('never rounds down, and float noise does not add a pack', () => {
    // 13 × 3 + 4 × 2 = 47 → 5 pk
    expect(line(emmaPlan({ kind: 'grillpolser' }), 'grillpolser').packs).toBe('5 pk à 10');
    // 20 × 3 = 60 → wiener 8 pk à 8 = 64
    expect(line(emmaPlan({ kind: 'wienerpolser' }, { kids: 20, adults: 0 }), 'wienerpolser')).toMatchObject({
      amount: '64 stk',
      packs: '8 pk à 8',
    });
    // a count that fits whole packs exactly takes no extra pack: 16 × 3 = 48 → 6 pk à 8
    expect(line(emmaPlan({ kind: 'wienerpolser' }, { kids: 16, adults: 0 }), 'wienerpolser')).toMatchObject({
      amount: '48 stk',
      packs: '6 pk à 8',
    });
    // one child, no adults: 3 → still a whole pack
    expect(line(emmaPlan({ kind: 'grillpolser' }, { kids: 1, adults: 0 }), 'grillpolser')).toMatchObject({
      amount: '10 stk',
      packs: '1 pk à 10',
    });
  });
  it('no adults: the reason line leaves them out', () => {
    expect(line(emmaPlan({ kind: 'grillpolser' }, { kids: 10, adults: 0 }), 'grillpolser').why).toBe(
      '10 barn × 3 = 30. 3 pk Gilde Grillpølser à 10 = 30, eller 1 storpakning (3 × 10)',
    );
  });
  it('more children → more packs: 20 children, 4 adults = 60 + 8 = 68 → 7 pk', () => {
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
    expect(plan.sections.map((s) => s.id)).toEqual(['main-polser', 'hensyn', 'drikke', 'snacks', 'kake']);
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
        expect(l.toggleable, l.id).toBe(['main-polser', 'drikke', 'snacks'].includes(s.id));
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
    expect(l).toMatchObject({ included: false, toggleable: true, amount: '32 stk' });
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
  it("changing the children changes the party, the food, Planen's numbers and the to-dos, with no ±1", () => {
    const before = emma({ menu: { kind: 'grillpolser' } });
    const p = withGuestCounts(before, { children: 15 });
    expect(p.children).toBe(15);
    expect(headCount(p).kidsComing).toBe(15);
    expect(foodCounts(p).kids).toBe(15);
    expect(foodCardSummary(p)!.line).toContain('for 15 barn');
    expect(buildTasks(p).tasks.find((t) => t.id === 'guestList')?.detail).toBe('15 barn');
    expect(line(partyFoodPlan(p)!, 'grillpolser').why).not.toBe(line(partyFoodPlan(before)!, 'grillpolser').why);
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
  it('the children stay inside the birthday children + 1 … 40', () => {
    expect(withGuestCounts(emma(), { children: 0 }).children).toBe(2);
    expect(withGuestCounts(emma(), { children: 99 }).children).toBe(40);
    const three = emma({
      celebrants: [
        { id: 'c1', name: 'A', age: 5 },
        { id: 'c2', name: 'B', age: 5 },
        { id: 'c3', name: 'C', age: 5 },
      ],
    });
    expect(guestBounds(three).kidsMin).toBe(4);
    expect(withGuestCounts(three, { children: 1 }).children).toBe(4);
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
