import { describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import { nb } from '../../i18n/nb';
import templates from '../texts/templates.json';
import { DIET_TAGS, type FoodItemState, type MenuChoice } from '../model';
import { shoppingList } from '../rules/food';
import { foodCardSummary, foodPlan } from '../rules/menu';

/**
 * Ekaterina, 21 Oct 2026: «juice skrives jus», and «Én av hver per påbegynte 20 som spiser» was not
 * understood. No text she can see may say «juice» or «påbegynte». Code names (JUICE_DL_CHILD) can stay.
 */
const BANNED = /juice|påbegynt/i;

const MENUS: MenuChoice[] = [
  { kind: 'grillpolser' },
  { kind: 'wienerpolser' },
  { kind: 'pizza', style: 'hjemmelaget' },
  { kind: 'pizza', style: 'frossen' },
  { kind: 'pizza', style: 'bestilt', takeawaySize: '30' },
  { kind: 'pizza', style: 'bestilt', takeawaySize: '40' },
  { kind: 'taco' },
  { kind: 'taco', shells: true },
  { kind: 'pasta', style: 'salat' },
  { kind: 'pasta', style: 'varm' },
  { kind: 'annet', text: 'Fiskeburger' },
  { kind: 'egen', name: 'Suppe', unit: 'dl', perChild: 2, perAdult: 3, bufferPct: 10, packSize: 10 } as MenuChoice,
];
const COUNTS = [
  { kids: 1, adults: 0 },
  { kids: 13, adults: 4 },
  { kids: 26, adults: 6 },
  { kids: 45, adults: 30 },
];
const LEFT_OUT: Record<string, FoodItemState>[] = [
  {},
  { lomper: { included: false } },
  { polsebrod: { included: false } },
];

describe('no «juice» or «påbegynte» in anything she can read', () => {
  it('every Mat line for every dish, head-count, age and diet', () => {
    const seen: string[] = [];
    for (const menu of MENUS)
      for (const counts of COUNTS)
        for (const age of [3, 5, 8, 10])
          for (const items of LEFT_OUT) {
            const plan = foodPlan({ menu, counts, age, diets: DIET_TAGS, celebrants: 2, items });
            seen.push(plan.title, plan.forWhom);
            for (const s of plan.sections) {
              seen.push(s.title);
              for (const l of s.lines) seen.push(l.name, l.amount, l.packs ?? '', l.why);
            }
          }
    expect(seen.length).toBeGreaterThan(1000);
    expect(seen.filter((t) => BANNED.test(t))).toEqual([]);
  });

  it('the shopping items and the Mat card on Planen', () => {
    const seen: string[] = [];
    for (const menu of MENUS) {
      const p = emma({ menu });
      for (const i of shoppingList(p)) seen.push(i.name, i.display, i.why ?? '');
      const card = foodCardSummary(p);
      if (card) seen.push(card.title, card.line);
    }
    expect(seen.filter((t) => BANNED.test(t))).toEqual([]);
  });

  it('the screen strings (i18n) and the text templates', () => {
    const seen: string[] = [];
    const walk = (x: unknown): void => {
      if (typeof x === 'string') seen.push(x);
      else if (typeof x === 'function') {
        try {
          walk((x as (...a: unknown[]) => unknown)(2, 3, 'Emma'));
        } catch {
          // a string builder that needs other arguments: its fixed words are covered by the Mat lines above
        }
      } else if (x && typeof x === 'object') Object.values(x).forEach(walk);
    };
    walk(nb);
    walk(templates);
    expect(seen.length).toBeGreaterThan(50);
    expect(seen.filter((t) => BANNED.test(t))).toEqual([]);
  });

  it('drinks say «jus»', () => {
    const plan = foodPlan({
      menu: { kind: 'taco' },
      counts: { kids: 13, adults: 4 },
      age: 5,
      diets: [],
      celebrants: 1,
    });
    const saft = plan.sections.find((s) => s.id === 'drikke')!.lines.find((l) => l.id === 'saft')!;
    expect(saft.name).toBe('Saft eller jus');
    expect(saft.why).toContain('Jus i stedet');
  });
});
