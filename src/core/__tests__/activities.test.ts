import { afterEach, describe, expect, it } from 'vitest';
import { i18n } from '../../i18n/i18n';
import { THEMES } from '../themes';
import {
  ACTIVITIES,
  ACTIVITY_IDS,
  activityFitsAges,
  activityShopLines,
  activityTodos,
  photoHuntItems,
  photoHuntText,
  pinataCandyGrams,
  resolveActivity,
} from '../rules/activities';

afterEach(() => {
  void i18n.changeLanguage('nb');
});

describe('activity catalog', () => {
  it('has unique ids, sane ages (3–10) and at least five free ones', () => {
    expect(new Set(ACTIVITY_IDS).size).toBe(ACTIVITIES.length);
    for (const a of ACTIVITIES) {
      expect(a.minAge).toBeGreaterThanOrEqual(3);
      expect(a.maxAge).toBeLessThanOrEqual(10);
      expect(a.minAge).toBeLessThanOrEqual(a.maxAge);
      expect(a.minutes).toBeGreaterThan(0);
      expect(a.outdoor).toBe(a.group === 'ute');
    }
    expect(ACTIVITIES.filter((a) => a.free).length).toBeGreaterThanOrEqual(5);
    expect(ACTIVITIES.find((a) => a.id === 'boksengaar')?.minAge).toBe(7);
  });

  it.each(['nb', 'en'] as const)('every activity has a name, 3–6 rules and both tips in %s', async (lng) => {
    await i18n.changeLanguage(lng);
    for (const id of ACTIVITY_IDS) {
      const r = resolveActivity(id);
      expect(r.name).not.toMatch(/program\.activities/);
      expect(r.steps.length).toBeGreaterThanOrEqual(3);
      expect(r.steps.length).toBeLessThanOrEqual(6);
      for (const s of [r.short, r.need, r.tipYounger, r.tipOlder, ...r.steps]) expect(s.trim()).not.toBe('');
      expect(r.themeTip).toBeNull();
    }
  });

  it('reads the same activity in Norwegian and English', async () => {
    expect(resolveActivity('skattejakt').name).toBe('Skattejakt');
    expect(resolveActivity('skattejakt').badge).toBe('Gratis');
    expect(resolveActivity('pinata').ages).toBe('4–10 år');
    expect(resolveActivity('pinata').minutesLabel).toBe('ca. 15 min');
    await i18n.changeLanguage('en');
    expect(resolveActivity('skattejakt').name).toBe('Treasure hunt');
    expect(resolveActivity('skattejakt').badge).toBe('Free');
    expect(resolveActivity('pinata').ages).toBe('ages 4–10');
    expect(resolveActivity('pinata').minutesLabel).toBe('about 15 min');
  });

  it('names the theme piñata', async () => {
    expect(resolveActivity('pinata', 'dinosaurer').themeTip).toBe('Til temaet kan dere se etter en dinosaur-piñata.');
    expect(resolveActivity('pinata', 'dinosaurer').name).toBe('Dinosaur-piñata');
    expect(activityTodos(['pinata'], 'dinosaurer')[0].title).toBe('Kjøp eller bestill dinosaur-piñata');
  });

  it('fits ages by overlap', () => {
    const boks = ACTIVITIES.find((a) => a.id === 'boksengaar')!;
    expect(activityFitsAges(boks, 4)).toBe(false);
    expect(activityFitsAges(boks, 4, 8)).toBe(true);
  });
});

describe('activity shopping and to-dos', () => {
  it('adds only lines for chosen activities, each once', () => {
    expect(activityShopLines(['skattejakt', 'stoppdans'], 10)).toEqual([]);
    const lines = activityShopLines(['pinata', 'fiskedam', 'eggeskje'], 10);
    expect(lines.map((l) => l.id)).toEqual(['pinata', 'pinataGodteri', 'premier', 'eggTilLop']);
    expect(lines.find((l) => l.id === 'pinataGodteri')?.amount).toBe('ca. 500 g');
    expect(lines.find((l) => l.id === 'premier')?.amount).toBe('10 stk, én per barn');
    expect(pinataCandyGrams(17)).toBe(900);
  });

  it('puts to-dos with days before', () => {
    const todos = activityTodos(['skattejakt', 'pinata']);
    expect(todos.map((x) => [x.id, x.daysBefore])).toEqual([
      ['drawMap', 1],
      ['hideTreasure', 0],
      ['buyPinata', 7],
      ['fillPinata', 1],
    ]);
  });
});

describe('fotojakt list', () => {
  it('has 10 different items, and rotates on a new round', () => {
    const a = photoHuntItems();
    expect(a).toHaveLength(10);
    expect(new Set(a).size).toBe(10);
    expect(photoHuntItems(null, 1)).not.toEqual(a);
    expect(photoHuntItems()).toEqual(a); // deterministic
  });

  it.each(THEMES.map((t) => t.id))('mixes in three theme items for %s', (id) => {
    const items = photoHuntItems(id);
    expect(items).toHaveLength(10);
    expect(new Set(items).size).toBe(10);
    expect(items.filter((s) => s.includes('program.'))).toEqual([]);
  });

  it('makes share-ready text in both languages', async () => {
    const text = photoHuntText(photoHuntItems('dinosaurer'), 'dinosaurer');
    expect(text.split('\n')[0]).toBe('📸 Fotojakt – Dinosaurer');
    expect(text).toContain('2. Noe som ligner et dinosauregg');
    expect(text).toContain('10. ');
    await i18n.changeLanguage('en');
    const en = photoHuntText(photoHuntItems(), null);
    expect(en.split('\n')[0]).toBe('📸 Photo hunt!');
    expect(en).toContain('1. Something red');
  });
});
