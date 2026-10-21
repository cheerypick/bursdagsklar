import { describe, expect, it } from 'vitest';
import {
  BRAND_PALETTE,
  contrastPairs,
  contrastRatio,
  LICENSE_DISCLAIMER,
  paletteFor,
  THEMES,
  type ThemePalette,
} from '../themes';
import { invitationCard } from '../texts/render';
import { summarize } from '../party';
import { emma } from '../__fixtures__/emma';

const PALETTE_KEYS: (keyof ThemePalette)[] = [
  'primary',
  'primaryHover',
  'onPrimary',
  'onPrimarySoft',
  'accent',
  'bg',
  'cardTint',
  'soft',
  'inviteTint',
  'inviteInk',
];
const HEX = /^#[0-9A-F]{6}$/i;

describe('contrast maths', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    // #767676 on white is the classic 4.54:1 grey
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });
});

describe('themes: every theme is complete', () => {
  const all: [string, ThemePalette][] = [
    ['brand', BRAND_PALETTE],
    ...THEMES.map((t) => [t.id, t.palette] as [string, ThemePalette]),
  ];

  it.each(all)('%s has a full palette of #RRGGBB colours', (_id, p) => {
    for (const k of PALETTE_KEYS) expect(p[k], k).toMatch(HEX);
    expect(Object.keys(p).sort()).toEqual([...PALETTE_KEYS].sort());
  });

  it.each(all)('%s reaches WCAG AA (4.5:1) on every text/background pair', (_id, p) => {
    for (const pair of contrastPairs(p)) {
      const ratio = contrastRatio(pair.fg, pair.bg);
      expect(ratio, `${pair.name}: ${pair.fg} on ${pair.bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(THEMES.map((t) => [t.id, t] as const))('%s has its own copy and motif', (_id, t) => {
    expect(t.name.length).toBeGreaterThan(0);
    expect(t.emoji.length).toBeGreaterThan(0);
    for (const line of [t.copy.greeting, t.copy.inviteHeadline, t.copy.cakeIdea, t.copy.playful]) {
      expect(line.trim().length).toBeGreaterThan(5);
    }
  });

  it('ids are unique and palettes differ between themes', () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(new Set(THEMES.map((t) => t.palette.primary)).size).toBe(THEMES.length);
  });

  it('only Pokémon, Paw Patrol and Frost are licensed names', () => {
    expect(
      THEMES.filter((t) => t.licensed)
        .map((t) => t.id)
        .sort(),
    ).toEqual(['frost', 'paw-patrol', 'pokemon']);
    expect(LICENSE_DISCLAIMER).toBe('Bursdagsklar er ikke tilknyttet Disney, Spin Master eller The Pokémon Company.');
  });

  it('uses the brand palette before a theme is chosen', () => {
    expect(paletteFor(null)).toBe(BRAND_PALETTE);
    expect(paletteFor(undefined)).toBe(BRAND_PALETTE);
    expect(paletteFor('frost').primary).toBe('#1F5A8A');
  });
});

describe('themes: texts follow the theme', () => {
  it('Frost: icy invitation and a blue/white cake idea', () => {
    const p = emma({ theme: 'frost' });
    expect(invitationCard(p).headline).toBe('Bli med på Frost-fest med snø og glitter!');
    expect(summarize(p, '2026-10-19').cakeIdea).toMatch(/^Lyseblå og hvit kake/);
  });
  it('Paw Patrol and Pokémon get their own lines', () => {
    expect(invitationCard(emma({ theme: 'paw-patrol' })).headline).toContain('Paw Patrol-fest');
    expect(
      summarize(
        emma({ theme: 'pokemon', cake: { mode: 'bake', cakeId: 'vaniljekake-langpanne', muffins: false } }),
        '2026-10-19',
      ).cakeIdea,
    ).toBe('Gul kake med lyn av sjokolade');
  });
  it('a bought cake stays a bought cake', () => {
    expect(
      summarize(
        emma({ theme: 'frost', cake: { mode: 'buy', cakeId: 'vaniljekake-langpanne', muffins: false } }),
        '2026-10-19',
      ).cakeIdea,
    ).toBe('Kake fra bakeren');
  });
});
