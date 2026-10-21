import { describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import {
  handleliste,
  nextCustomId,
  shareText,
  shoppingCardLine,
  shoppingTitle,
  withGoodieBagItem,
  withCustomItem,
  withoutCustomItem,
  withTick,
  withTicksCleared,
} from '../rules/shopping';
import { withFoodItem, withGuestCounts } from '../party';
import { shoppingList } from '../rules/food';
import { createPartyRepository, memoryStore, migrate } from '../storage/PartyRepository';
import type { Party } from '../model';

const ids = (p: Party) => handleliste(p).groups.flatMap((g) => g.items.map((i) => i.id));
const item = (p: Party, id: string) =>
  handleliste(p)
    .groups.flatMap((g) => g.items)
    .find((i) => i.id === id);

describe('Handleliste from Emma’s party (13 children, 4 adults, grillpølser)', () => {
  const list = handleliste(emma());

  it('groups by store section, in shop order', () => {
    expect(list.groups.map((g) => g.title)).toEqual([
      'Kjøtt og pålegg',
      'Brød',
      'Frukt og grønt',
      'Drikke',
      'Tørrvarer',
      'Fest og pynt',
      'Godteposer',
    ]);
    expect(list.title).toBe('Handleliste – Emmas bursdag 7. nov');
    expect(list.menuChosen).toBe(true);
  });

  it('has the Mat lines with the same amounts and pack sizes', () => {
    // 13 × 3 + 4 × 2 = 47 → 5 pk à 10 = 50; lomper and pølsebrød ca. 30 each
    expect(item(emma(), 'grillpolser')).toMatchObject({
      group: 'kjott',
      qty: '5 pk',
      detail: 'à 10, 50 stk i alt',
      text: '5 pk grillpølser',
    });
    expect(item(emma(), 'lomper')).toMatchObject({
      group: 'brod',
      qty: '3 pk',
      detail: 'à 10, 30 stk i alt',
      text: '3 pk lomper',
    });
    expect(item(emma(), 'polsebrod')).toMatchObject({
      group: 'brod',
      qty: '4 pk',
      detail: 'à 8, 32 stk i alt',
      text: '4 pk pølsebrød',
    });
    expect(item(emma(), 'ketchup')).toMatchObject({ group: 'torrvarer', text: 'Ketchup og sennep: 1 av hver' });
    expect(item(emma(), 'lok')).toMatchObject({ group: 'torrvarer', text: '2 poser sprøstekt løk' });
    expect(item(emma(), 'saft')?.detail).toBe('Eller jus. Se Mat for mengden');
    expect(item(emma(), 'saft')).toMatchObject({
      group: 'drikke',
      name: 'Saft',
      qty: '2 flasker',
      text: '2 flasker saft',
    });
    expect(item(emma(), 'frukt')).toMatchObject({ group: 'frukt', text: 'ca. 2,3 kg frukt og grønt' });
  });

  it('has the party things: goodie bags (nothing inside them by default), one candle set per birthday child, tableware', () => {
    expect(item(emma(), 'godteposer')).toMatchObject({ group: 'godteposer', qty: '13 stk', text: '13 godteposer' });
    // everyone fills the bags with what they want: no candy (or anything else) is assumed
    expect(ids(emma()).filter((i) => i.startsWith('pose-'))).toEqual([]);
    expect(handleliste(emma()).goodieBagSuggestions.map((s) => [s.label, s.picked])).toEqual([
      ['Godteri', false],
      ['Popcorn', false],
      ['Rosiner', false],
      ['Klistremerker', false],
      ['Såpebobler', false],
      ['Viskelær/blyant', false],
      ['Fruktstang', false],
    ]);
    expect(item(emma(), 'kakelys')).toMatchObject({ group: 'fest', qty: '1 sett', detail: '6 lys til Emma' });
    expect(item(emma(), 'pappkrus-og-fat')?.text).toBe('Tallerkener, kopper og servietter til 17');
    const joint = emma({
      celebrants: [
        { id: 'c1', name: 'Emma', age: 5 },
        { id: 'c2', name: 'Jonas', age: 7 },
      ],
    });
    expect(item(joint, 'kakelys')).toMatchObject({ qty: '2 sett', text: '2 sett kakelys' });
    expect(shoppingTitle(joint)).toBe("Handleliste – Emma og Jonas' bursdag 7. nov");
  });

  it('leaves out what is not bought: tap water, the cake, things they have at home', () => {
    expect(ids(emma())).not.toContain('vann');
    expect(ids(emma())).not.toContain('kake');
    expect(ids(emma({ haveAtHome: ['kakelys', 'ballonger'] }))).not.toContain('kakelys');
    expect(ids(emma({ haveAtHome: ['kakelys', 'ballonger'] }))).not.toContain('ballonger');
  });

  it('counts the items for the Planen card', () => {
    expect(list.count).toBe(12);
    expect(shoppingCardLine(list)).toBe('12 varer');
    expect(shoppingCardLine(handleliste(withTick(emma(), 'saft', true)))).toBe('12 varer · 1 kjøpt');
  });

  it('without a main dish: drinks, fruit and party things only', () => {
    const l = handleliste(emma({ menu: null }));
    expect(l.menuChosen).toBe(false);
    expect(ids(emma({ menu: null }))).toEqual(expect.arrayContaining(['saft', 'frukt', 'godteposer', 'kakelys']));
    expect(ids(emma({ menu: null }))).not.toContain('grillpolser');
  });

  it('a dietary extra from Mat is on the list in its section', () => {
    const p = emma({ diets: ['ingen-svin'] });
    expect(item(p, 'diet-ingen-svin')).toMatchObject({ group: 'kjott', text: '1 pk kyllingpølser' });
  });
});

describe('Handleliste follows the Mat screen and the party', () => {
  it('a line deselected on Mat is not on the list', () => {
    const p = withFoodItem(emma(), 'polsebrod', false);
    expect(ids(p)).not.toContain('polsebrod');
    expect(ids(p)).toContain('lomper');
    expect(ids(withFoodItem(p, 'polsebrod', true))).toContain('polsebrod');
  });

  it('goodie-bag suggestions: tapping Popcorn adds it (one per child), tapping again takes it off', () => {
    const on = withGoodieBagItem(emma(), 'popcorn', true);
    expect(item(on, 'pose-popcorn')).toMatchObject({
      group: 'godteposer',
      name: 'Popcorn, små poser',
      qty: '13 stk',
      text: '13 små poser popcorn',
    });
    expect(handleliste(on).goodieBagSuggestions.find((s) => s.id === 'popcorn')?.picked).toBe(true);
    // candy, when picked: ca. 100 g per bag
    const both = withGoodieBagItem(on, 'godteri', true);
    expect(item(both, 'pose-godteri')).toMatchObject({ qty: 'ca. 1,3 kg', text: 'ca. 1,3 kg godteri til godteposene' });
    // listed in suggestion order, under the bags
    expect(
      handleliste(both)
        .groups.find((g) => g.id === 'godteposer')!
        .items.map((i) => i.id),
    ).toEqual(['godteposer', 'pose-godteri', 'pose-popcorn']);
    const ticked = withTick(both, 'pose-popcorn', true);
    const off = withGoodieBagItem(ticked, 'popcorn', false);
    expect(ids(off)).not.toContain('pose-popcorn');
    expect(off.shopping.ticked).toEqual([]);
    expect(off.goodieBags.contents).toEqual(['godteri']);
  });

  it('ticks survive a children-count change (stable ids) and move to the bottom of their group', () => {
    let p = withTick(withGoodieBagItem(emma(), 'godteri', true), 'grillpolser', true);
    p = withTick(p, 'pose-godteri', true);
    const before = item(p, 'grillpolser')!;
    p = withGuestCounts(p, { children: 20 });
    const after = item(p, 'grillpolser')!;
    expect(after.qty).not.toBe(before.qty);
    expect(after.ticked).toBe(true);
    expect(item(p, 'pose-godteri')).toMatchObject({ ticked: true, qty: 'ca. 2 kg' });
    // ticked items move to the bottom of their group
    const kjott = handleliste(p).groups.find((g) => g.id === 'kjott')!;
    expect(kjott.items.at(-1)?.id).toBe('grillpolser');
    expect(handleliste(p).tickedCount).toBe(2);
    expect(handleliste(withTicksCleared(p)).tickedCount).toBe(0);
    expect(withTick(p, 'grillpolser', false).shopping.ticked).toEqual(['pose-godteri']);
  });

  it('own items: added to «Egne varer», persisted, deletable, ids never reused while in the list', () => {
    let p = withCustomItem(emma(), '  Bursdagsservietter   med enhjørning ');
    p = withCustomItem(p, 'Sugerør');
    p = withCustomItem(p, '   ');
    expect(p.shopping.custom).toEqual([
      { id: 'egen-1', text: 'Bursdagsservietter med enhjørning' },
      { id: 'egen-2', text: 'Sugerør' },
    ]);
    const egne = handleliste(p).groups.at(-1)!;
    expect(egne.title).toBe('Egne varer');
    expect(egne.items.map((i) => [i.text, i.custom])).toEqual([
      ['Bursdagsservietter med enhjørning', true],
      ['Sugerør', true],
    ]);
    p = withTick(p, 'egen-1', true);
    p = withoutCustomItem(p, 'egen-1');
    expect(p.shopping).toEqual({ ticked: [], custom: [{ id: 'egen-2', text: 'Sugerør' }] });
    expect(nextCustomId(p.shopping.custom)).toBe('egen-3');
    expect(handleliste(p).count).toBe(13);
  });
});

describe('Handleliste with homemade pizza and with pølser + pizza (PR #5)', () => {
  const pizza = (extra: Partial<Party> = {}) =>
    emma({
      menu: { kind: 'pizza', style: 'hjemmelaget', toppings: ['skinke', 'pepperoni', 'paprika', 'sopp'] },
      ...extra,
    });
  const groupOf = (p: Party, id: string) => handleliste(p).groups.find((g) => g.items.some((i) => i.id === id))?.id;

  it('dough, sauce, cheese and each topping chip, in sensible store sections; not the trays themselves', () => {
    const p = pizza();
    expect(item(p, 'pizzadeig')).toMatchObject({ qty: '4 pk', text: '4 pk ferdig pizzadeig' });
    expect(groupOf(p, 'pizzadeig')).toBe('brod');
    expect(item(p, 'pizzasaus')).toMatchObject({ qty: '2 glass', text: '2 glass pizzasaus' });
    expect(groupOf(p, 'pizzasaus')).toBe('torrvarer');
    expect(item(p, 'pizzaost')).toMatchObject({ qty: '2 poser', text: '2 poser revet ost' });
    expect(groupOf(p, 'pizzaost')).toBe('kjott');
    expect(groupOf(p, 'pizzaskinke')).toBe('kjott');
    expect(item(p, 'pepperoni')).toMatchObject({ qty: '4 pk', text: '4 pk pepperoni' });
    expect(groupOf(p, 'pepperoni')).toBe('kjott');
    expect(groupOf(p, 'paprika')).toBe('frukt');
    expect(item(p, 'sopp')).toMatchObject({ qty: '4 bokser', text: '4 bokser sopp' });
    expect(groupOf(p, 'sopp')).toBe('torrvarer');
    expect(ids(p)).not.toContain('langpanner');
    expect(ids(p)).not.toContain('ananas');
  });
  it('the other bases: ferdigstekte bunner by the bread, pizzamiks and flour with the dry goods', () => {
    const rounds = emma({ menu: { kind: 'pizza', style: 'hjemmelaget', dough: 'ferdigstekt' } });
    expect(groupOf(rounds, 'pizzabunner')).toBe('brod');
    // Emma: 6 bunner (13 ÷ 4 + 4 ÷ 2, rounded up) → 3 pk à 2
    expect(item(rounds, 'pizzabunner')).toMatchObject({ qty: '3 pk', text: '3 pk ferdigstekte pizzabunner' });
    expect(shoppingList(rounds).find((i) => i.id === 'pizzabunner')).toMatchObject({ need: 6, packs: 3, packSize: 2 });
    expect(groupOf(emma({ menu: { kind: 'pizza', style: 'hjemmelaget', dough: 'miks' } }), 'pizzamiks')).toBe(
      'torrvarer',
    );
    const self = emma({ menu: { kind: 'pizza', style: 'hjemmelaget', dough: 'selv' } });
    expect(groupOf(self, 'hvetemel')).toBe('torrvarer');
    expect(groupOf(self, 'gjaer')).toBe('kjott');
  });
  it('glutenfri: the Brisk base is on the list', () => {
    expect(item(pizza({ diets: ['glutenfri'] }), 'diet-glutenfri')?.name).toBe('1 Brisk Glutenfri pizzabunn 300 g');
  });
  it('pølser + pizza: both, with the halved amounts, and one glutenfri extra per dish', () => {
    const p = emma({
      menu: { kind: 'flere', dishes: [{ kind: 'grillpolser' }, { kind: 'pizza', style: 'hjemmelaget' }] },
      diets: ['glutenfri'],
    });
    expect(item(p, 'grillpolser')?.qty).toBe('3 pk');
    expect(item(p, 'pizzadeig')?.qty).toBe('2 pk');
    expect(groupOf(p, 'diet-glutenfri')).toBe('brod');
    expect(item(p, 'diet-glutenfri-pizza-hjemmelaget')?.name).toBe('1 Brisk Glutenfri pizzabunn 300 g');
    expect(shareText(handleliste(p))).toContain('☐ 2 pk ferdig pizzadeig');
  });
});

describe('shareText', () => {
  it('plain Norwegian, groups, ☐ lines, only what is not ticked yet', () => {
    let p = withCustomItem(withGoodieBagItem(emma(), 'popcorn', true), 'Sugerør');
    p = withTick(p, 'saft', true);
    p = withTick(p, 'ballonger', true);
    const text = shareText(handleliste(p));
    expect(text).toBe(
      [
        'Handleliste – Emmas bursdag 7. nov',
        '',
        'Kjøtt og pålegg',
        '☐ 5 pk grillpølser',
        '',
        'Brød',
        `☐ ${item(p, 'lomper')!.text}`,
        `☐ ${item(p, 'polsebrod')!.text}`,
        '',
        'Frukt og grønt',
        '☐ ca. 2,3 kg frukt og grønt',
        '',
        'Tørrvarer',
        '☐ Ketchup og sennep: 1 av hver',
        '☐ 2 poser sprøstekt løk',
        '',
        'Fest og pynt',
        '☐ 1 sett kakelys',
        '☐ Tallerkener, kopper og servietter til 17',
        '☐ 1 bursdagskrone',
        '',
        'Godteposer',
        '☐ 13 godteposer',
        '☐ 13 små poser popcorn',
        '',
        'Egne varer',
        '☐ Sugerør',
      ].join('\n'),
    );
    expect(text).not.toContain('saft');
    expect(text).not.toContain('allonger');
  });

  it('says so when everything is bought', () => {
    let p = emma();
    for (const id of handleliste(p).groups.flatMap((g) => g.items.map((i) => i.id))) p = withTick(p, id, true);
    expect(shareText(handleliste(p))).toBe('Handleliste – Emmas bursdag 7. nov\n\nAlt er handlet.');
    expect(shoppingCardLine(handleliste(p))).toBe('Alt er handlet · 12 varer');
  });
});

describe('storage: schema v6', () => {
  it('a v5 party opens with an empty list and nothing picked for the goodie bags', () => {
    const { shopping: _s, goodieBags: _g, ...v5 } = emma();
    void _s;
    void _g;
    const p = migrate({ ...v5, schemaVersion: 5 })!;
    expect(p.schemaVersion).toBe(6);
    expect(p.shopping).toEqual({ ticked: [], custom: [] });
    expect(p.goodieBags).toEqual({ contents: [] });
  });

  it('ticks and own items survive a save and a load; reset clears them', async () => {
    const store = memoryStore();
    const repo = createPartyRepository(store);
    let p = withTick(withCustomItem(withGoodieBagItem(emma(), 'rosiner', true), 'Sugerør'), 'grillpolser', true);
    await repo.save(p);
    await repo.setActiveId(p.id);
    p = (await repo.get(p.id))!;
    expect(p.shopping).toEqual({ ticked: ['grillpolser'], custom: [{ id: 'egen-1', text: 'Sugerør' }] });
    expect(p.goodieBags.contents).toEqual(['rosiner']);
    await repo.reset();
    expect(await repo.get(p.id)).toBeNull();
    expect(Object.keys(store.dump())).toEqual([]);
  });
});
