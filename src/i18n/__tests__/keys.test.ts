import { describe, expect, it } from 'vitest';
import { en } from '../en';
import { nb } from '../nb';
import { i18n } from '../i18n';

/** Every key path in a resource: «date.title», «who.ageLabel_one» … */
function keyPaths(o: object, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keyPaths(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}
/** The {{placeholders}} a string uses, sorted. */
const slots = (s: string) => [...s.matchAll(/\{\{(\w+)/g)].map((m) => m[1]).sort();

describe('language files (src/i18n)', () => {
  it('nb and en have exactly the same keys (none missing, none extra)', () => {
    const nbKeys = keyPaths(nb).sort();
    const enKeys = keyPaths(en).sort();
    expect(enKeys.filter((k) => !nbKeys.includes(k))).toEqual([]);
    expect(nbKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
    expect(nbKeys.length).toBeGreaterThan(500);
  });

  it('every value is a non-empty string', () => {
    for (const res of [nb, en]) {
      const leaves: unknown[] = [];
      const walk = (x: unknown) => (x && typeof x === 'object' ? Object.values(x).forEach(walk) : leaves.push(x));
      walk(res);
      expect(leaves.filter((v) => typeof v !== 'string' || v.trim() === '')).toEqual([]);
    }
  });

  it('nb and en fill in the same {{placeholders}} (en may leave out an nb-only one, never add)', () => {
    const get = (o: object, path: string) =>
      path.split('.').reduce<unknown>((x, k) => (x as Record<string, unknown>)[k], o) as string;
    const extra: string[] = [];
    for (const k of keyPaths(nb)) {
      const nbSlots = slots(get(nb, k));
      for (const s of slots(get(en, k))) if (!nbSlots.includes(s)) extra.push(`${k}: {{${s}}}`);
    }
    // only English needs these: the ordinal («5th») and «1 adult / 2 adults» (nb keeps its fixed «voksne»)
    expect(extra.sort()).toEqual([
      'rules.party.menuLine: {{adults}}',
      'rules.party.menuLine: {{kids}}',
      'rules.party.planTitle: {{ord}}',
    ]);
  });

  it('plurals follow each language: nb «1 dag / 2 dager», en «1 day / 2 days»', async () => {
    expect(i18n.t('ready.days', { count: 1, lng: 'nb' })).toBe('1 dag');
    expect(i18n.t('ready.days', { count: 2, lng: 'nb' })).toBe('2 dager');
    expect(i18n.t('ready.days', { count: 1, lng: 'en' })).toBe('1 day');
    expect(i18n.t('ready.days', { count: 2, lng: 'en' })).toBe('2 days');
  });

  it('starts in nb, the default and source of truth', () => {
    expect(i18n.language).toBe('nb');
    expect(i18n.t('common.next')).toBe('Neste');
  });
});
