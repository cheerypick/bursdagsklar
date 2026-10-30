import { afterEach, describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import { i18n } from '../../i18n/i18n';
import type { GoodieBagItemId, Party } from '../model';
import {
  candyPerBag,
  goodieBagCount,
  goodieCardLine,
  goodieChips,
  goodieShopLines,
  goodieStatus,
  goodieStyle,
  smallPartsHidden,
  withGoodieSkip,
  withGoodieStyle,
} from '../rules/goodieBags';
import { handleliste, withGoodieBagItem, withTick } from '../rules/shopping';
import { buildTasks } from '../rules/todos';
import { programmeTimeline } from '../rules/programme';
import { createPartyRepository, memoryStore, migrate } from '../storage/PartyRepository';
import { CANDY_G_CHILD } from '../rules/constants';

/** Godteposer (Ekaterina, 30 Oct 2026): optional, three styles or «Vi dropper», chips adapted to age and theme. */
const plain = (o: Partial<Party> = {}) => emma({ theme: null, ...o });
const ids = (p: Party) => goodieChips(p).map((c) => c.id);
const pick = (p: Party, ...items: GoodieBagItemId[]) => items.reduce((q, id) => withGoodieBagItem(q, id, true), p);
const bagLines = (p: Party) =>
  handleliste(p)
    .groups.filter((g) => g.id === 'godteposer')
    .flatMap((g) => g.items.map((i) => i.text));
const taskIds = (p: Party) => buildTasks(p).tasks.map((t) => t.id);

afterEach(() => void i18n.changeLanguage('nb'));

describe('nothing is chosen by default', () => {
  it('a new party: no style, no chips, the bags on the list (as before), Planen says it is optional', () => {
    const p = plain();
    expect(goodieStatus(p)).toBe('open');
    expect(goodieStyle(p)).toBeNull();
    expect(goodieChips(p)).toEqual([]);
    expect(bagLines(p)).toEqual(['13 godteposer']);
    expect(goodieCardLine(p)).toBe('Valgfritt: godteri, uten godteri eller litt av begge');
  });
  it('a style only shows suggestions: nothing is picked for her', () => {
    const p = withGoodieStyle(plain(), 'uten');
    expect(p.goodieBags.contents).toEqual([]);
    expect(goodieStatus(p)).toBe('chosen');
    expect(goodieCardLine(p)).toBe('Uten godteri');
    expect(bagLines(p)).toEqual(['13 godteposer']);
  });
});

describe('style → chips', () => {
  it('klassisk, uten and begge each suggest their own things (Emma is 5)', () => {
    expect(ids(withGoodieStyle(plain(), 'klassisk'))).toEqual(['godteri', 'sjokolade', 'popcorn', 'klistremerker']);
    expect(ids(withGoodieStyle(plain(), 'uten'))).toEqual([
      'klistremerker',
      'tatoveringer',
      'fargestifter',
      'sapebobler',
      'viskelaer',
      'sprettball',
      'smafigurer',
      'rosiner',
      'fruktstang',
    ]);
    const begge = ids(withGoodieStyle(plain(), 'begge'));
    expect(begge).toContain('godteri');
    expect(begge).toContain('klistremerker');
    expect(begge).not.toContain('sjokolade');
  });
  it('«Uten godteri» has no candy at all', () => {
    expect(ids(withGoodieStyle(plain(), 'uten'))).not.toEqual(expect.arrayContaining(['godteri']));
    expect(ids(withGoodieStyle(plain(), 'uten'))).not.toContain('sjokolade');
    expect(ids(withGoodieStyle(plain(), 'uten'))).not.toContain('popcorn');
  });
  it('switching style keeps what she picked (shown, never hidden), it only changes the suggestions', () => {
    const p = withGoodieStyle(pick(withGoodieStyle(plain(), 'klassisk'), 'godteri'), 'uten');
    expect(p.goodieBags.contents).toEqual(['godteri']);
    expect(goodieChips(p).find((c) => c.id === 'godteri')).toMatchObject({ picked: true });
  });
});

describe('age', () => {
  const three = (style: 'uten' | 'begge') =>
    withGoodieStyle(plain({ celebrants: [{ id: 'c1', name: 'Ola', age: 3 }] }), style);
  it('small parts (sprettball, små figurer) are suggested from 4, with a soft «fra 4 år»', () => {
    expect(ids(three('uten'))).not.toContain('sprettball');
    expect(ids(three('uten'))).not.toContain('smafigurer');
    expect(ids(three('begge'))).not.toContain('sprettball');
    expect(smallPartsHidden(three('uten'))).toBe(true);
    const five = goodieChips(withGoodieStyle(plain(), 'uten'));
    expect(five.find((c) => c.id === 'sprettball')).toMatchObject({ minAge: 4 });
    expect(smallPartsHidden(withGoodieStyle(plain(), 'uten'))).toBe(false);
  });
  it('a joint party follows the youngest birthday child', () => {
    const p = withGoodieStyle(
      plain({
        celebrants: [
          { id: 'c1', name: 'Emma', age: 7 },
          { id: 'c2', name: 'Jonas', age: 3 },
        ],
      }),
      'uten',
    );
    expect(ids(p)).not.toContain('smafigurer');
  });
  it('something she already picked stays visible, also under the age', () => {
    const p = pick(three('uten'), 'sprettball');
    expect(ids(p)).toContain('sprettball');
  });
});

describe('theme', () => {
  it('stickers and tattoos take the theme in plain words (no brand names)', () => {
    const uni = goodieChips(withGoodieStyle(emma(), 'uten'));
    expect(uni.find((c) => c.id === 'klistremerker')?.label).toBe('Klistremerker med enhjørninger');
    expect(uni.find((c) => c.id === 'tatoveringer')?.label).toBe('Tatoveringer med enhjørninger');
    expect(uni.find((c) => c.id === 'fargestifter')?.label).toBe('Fargestifter');
    const pk = goodieChips(withGoodieStyle(emma({ theme: 'paw-patrol' }), 'uten'));
    expect(pk.find((c) => c.id === 'klistremerker')?.label).toBe('Klistremerker med hundevalper');
    const none = goodieChips(withGoodieStyle(plain(), 'uten'));
    expect(none.find((c) => c.id === 'klistremerker')?.label).toBe('Klistremerker');
  });
  it('every theme has a motif in both languages, and none of them is a brand', () => {
    for (const theme of [
      'enhjorning',
      'dinosaurer',
      'verdensrommet',
      'fotball',
      'dyr-i-skogen',
      'pokemon',
      'paw-patrol',
      'frost',
    ] as const) {
      for (const lng of ['nb', 'en'] as const) {
        void i18n.changeLanguage(lng);
        const label = goodieChips(withGoodieStyle(emma({ theme }), 'uten'))[0].label;
        expect(label).not.toMatch(/pokémon|pokemon|paw patrol|frost|disney|elsa/i);
        expect(label.length).toBeGreaterThan(12);
      }
    }
  });
});

describe('amounts: one per child, the ONE children number', () => {
  it('13 children in total (Emma included) → 13 bags and 13 of each pick', () => {
    const p = pick(withGoodieStyle(plain(), 'uten'), 'klistremerker', 'sapebobler');
    expect(goodieBagCount(p)).toBe(13);
    expect(bagLines(p)).toEqual(['13 godteposer', '13 ark klistremerker', '13 såpebobler']);
  });
  it('a joint party: the birthday children are already in the number (no ±1)', () => {
    const p = pick(
      plain({
        children: 20,
        celebrants: [
          { id: 'c1', name: 'Emma', age: 5 },
          { id: 'c2', name: 'Jonas', age: 7 },
        ],
      }),
      'fargestifter',
    );
    expect(bagLines(p)).toEqual(['20 godteposer', '20 små pakker fargestifter']);
  });
  it('a child who said no gets no bag', () => {
    const p = plain({
      guests: [{ id: 'g1', name: 'Kari', status: 'no', allergies: [], adultsStaying: 0 } as never],
    });
    expect(goodieBagCount(p)).toBe(12);
  });
  it('candy follows the existing constant: ca. 100 g per bag, half with «Litt av begge»', () => {
    expect(candyPerBag('klassisk')).toBe(CANDY_G_CHILD);
    expect(candyPerBag('begge')).toBe(CANDY_G_CHILD / 2);
    const klassisk = pick(withGoodieStyle(plain(), 'klassisk'), 'godteri');
    expect(goodieShopLines(klassisk).find((l) => l.id === 'pose-godteri')).toMatchObject({
      qty: 'ca. 1,3 kg',
      detail: 'ca. 100 g per pose',
    });
    const begge = pick(withGoodieStyle(plain(), 'begge'), 'godteri');
    expect(goodieShopLines(begge).find((l) => l.id === 'pose-godteri')).toMatchObject({
      qty: '650 g',
      detail: 'ca. 50 g per pose',
    });
  });
  it('themed stickers are named on the list too', () => {
    const p = pick(withGoodieStyle(emma(), 'uten'), 'tatoveringer');
    expect(bagLines(p)).toContain('13 ark tatoveringer med enhjørninger');
  });
});

describe('«Vi dropper godteposer»', () => {
  it('nothing about bags on Handleliste or in Gjøremål; Planen shows it as decided', () => {
    const before = withTick(
      withTick(pick(withGoodieStyle(plain(), 'uten'), 'klistremerker'), 'godteposer', true),
      'grillpolser',
      true,
    );
    expect(taskIds(before)).toContain('packBags');
    const p = withGoodieSkip(before, true);
    expect(goodieStatus(p)).toBe('skip');
    expect(bagLines(p)).toEqual([]);
    expect(handleliste(p).groups.map((g) => g.id)).not.toContain('godteposer');
    expect(taskIds(p)).not.toContain('packBags');
    expect(goodieCardLine(p)).toBe('Vi dropper godteposer');
    // the bag ticks go, the other ticks stay; her picks are kept for a change of heart
    expect(p.shopping.ticked).toEqual(['grillpolser']);
    expect(p.goodieBags.contents).toEqual(['klistremerker']);
  });
  it('the skattejakt still hides a treasure, and the day ends without «Godteposer»', () => {
    const p = withGoodieSkip(plain(), true);
    const hide = buildTasks(p).tasks.find((t) => t.id === 'hideTreasure');
    expect(hide?.title).toBe('Gjem skatten til skattejakten før gjestene kommer');
    expect(programmeTimeline(p).at(-1)?.title).toBe('Takk for i dag og hjem');
    expect(programmeTimeline(plain()).at(-1)?.title).toBe('Godteposer og hjem');
  });
  it('picking a style takes it back: the bags are on the list again with her picks', () => {
    const p = withGoodieStyle(withGoodieSkip(pick(plain(), 'klistremerker'), true), 'uten');
    expect(goodieStatus(p)).toBe('chosen');
    expect(bagLines(p)).toEqual(['13 godteposer', '13 ark klistremerker']);
    expect(withGoodieSkip(withGoodieSkip(plain(), true), false).goodieBags).toEqual({ contents: [] });
  });
});

describe('to-do: «Pakk godteposene» the day before', () => {
  it('one to-do the day before, linked to the screen; the skattejakt keeps its own «gjem» on the day', () => {
    const tasks = buildTasks(plain()).tasks;
    const pack = tasks.find((t) => t.id === 'packBags')!;
    expect(pack).toMatchObject({
      date: '2026-11-06',
      title: 'Pakk godteposene',
      detail: '13 poser, én til hvert barn',
      link: { route: '/godteposer' },
    });
    expect(tasks.find((t) => t.id === 'hideTreasure')?.date).toBe('2026-11-07');
    expect(tasks.filter((t) => /godtepose/i.test(`${t.title} ${t.detail ?? ''}`)).map((t) => t.id)).toEqual([
      'packBags',
      'hideTreasure',
    ]);
  });
});

describe('old parties open fine (no schema bump)', () => {
  it('earlier picks from Handleliste give the style they point to; nothing is lost', () => {
    expect(goodieStyle(plain({ goodieBags: { contents: ['godteri', 'popcorn'] } }))).toBe('klassisk');
    expect(goodieStyle(plain({ goodieBags: { contents: ['rosiner', 'klistremerker'] } }))).toBe('uten');
    expect(goodieStyle(plain({ goodieBags: { contents: ['godteri', 'sapebobler'] } }))).toBe('begge');
    const old = plain({ goodieBags: { contents: ['popcorn', 'viskelaer'] } });
    expect(
      goodieChips(old)
        .filter((c) => c.picked)
        .map((c) => c.id),
    ).toEqual(['popcorn', 'viskelaer']);
    expect(bagLines(old)).toEqual(['13 godteposer', '13 små poser popcorn', '13 viskelær eller blyanter']);
  });
  it('the stored record keeps style and skip, drops nonsense, and a v5 record opens with nothing chosen', async () => {
    const repo = createPartyRepository(memoryStore());
    const saved = withGoodieSkip(withGoodieStyle(pick(plain(), 'klistremerker'), 'uten'), true);
    await repo.save(saved);
    expect((await repo.get(saved.id))?.goodieBags).toEqual({ contents: ['klistremerker'], style: 'uten', skip: true });
    const odd = migrate({
      ...plain(),
      goodieBags: { contents: ['popcorn', 'x'], style: 'lots', skip: 'yes' },
    } as never);
    expect(odd?.goodieBags).toEqual({ contents: ['popcorn'] });
    const { goodieBags: _g, shopping: _s, ...v5 } = plain();
    const up = migrate({ ...v5, schemaVersion: 5 } as never);
    expect(up?.goodieBags).toEqual({ contents: [] });
    expect(goodieStatus(up!)).toBe('open');
  });
});

describe('nb and en', () => {
  it('the same rules in English', () => {
    void i18n.changeLanguage('en');
    const p = pick(withGoodieStyle(emma(), 'begge'), 'godteri', 'klistremerker');
    expect(goodieCardLine(p)).toBe('A bit of both · 2 things');
    expect(goodieChips(p).find((c) => c.id === 'klistremerker')?.label).toBe('Stickers with unicorns');
    expect(bagLines(p)).toEqual([
      '13 goodie bags',
      '650 g sweets for the goodie bags',
      '13 sheets of stickers with unicorns',
    ]);
    expect(goodieCardLine(withGoodieSkip(p, true))).toBe("We're skipping goodie bags");
    expect(buildTasks(plain()).tasks.find((t) => t.id === 'packBags')).toMatchObject({
      title: 'Pack the goodie bags',
      detail: '13 bags, one for each child',
    });
  });
});
