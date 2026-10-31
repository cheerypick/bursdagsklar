import { afterEach, describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import { i18n } from '../../i18n/i18n';
import type { Party } from '../model';
import { CARD_IDS, MAX_INFO_LINES, sanitizeInvitation, withInvitation } from '../rules/invitation';
import {
  availableInfoLines,
  CARD_STYLES,
  cardFace,
  cardForTheme,
  cardScale,
  chosenInfoLines,
  headlineSize,
  infoLineText,
  resolvedCardId,
  toggleInfoLine,
  toNameSize,
} from '../rules/printCards';
import { THEMES } from '../themes';

/** The illustrated printed card, filled in from the plan (Ekaterina, 30 Oct 2026). */
afterEach(() => void i18n.changeLanguage('nb'));

// Emma 6, Saturday 14 November 15–17, pizza, a treasure hunt picked (not outdoors), at home
const party = (o: Partial<Party> = {}) =>
  emma({
    celebrants: [{ id: 'c1', name: 'Emma', age: 6 }],
    date: '2026-11-14',
    start: '15:00',
    end: '17:00',
    menu: { kind: 'pizza', style: 'hjemmelaget' },
    programme: { activities: [] },
    ...o,
  });
const joint = () =>
  party({
    celebrants: [
      { id: 'c1', name: 'Emma', age: 5 },
      { id: 'c2', name: 'Jonas', age: 7 },
    ],
  });

describe('which card', () => {
  it('one card per theme with our own drawing; «Bursdag» without a theme and for the brand themes', () => {
    expect(CARD_IDS).toEqual(['bursdag', 'enhjorning', 'dinosaurer', 'verdensrommet', 'fotball', 'dyr-i-skogen']);
    expect(cardForTheme(null)).toBe('bursdag');
    for (const th of THEMES) expect(cardForTheme(th.id)).toBe(th.licensed ? 'bursdag' : th.id);
    expect(cardForTheme('pokemon')).toBe('bursdag');
    expect(cardForTheme('frost')).toBe('bursdag');
    expect(cardForTheme('paw-patrol')).toBe('bursdag');
  });

  it('her pick («Velg kort») wins over the theme; an unknown stored id falls back', () => {
    expect(resolvedCardId(party())).toBe('enhjorning');
    expect(resolvedCardId(withInvitation(party(), { cardId: 'dinosaurer' }))).toBe('dinosaurer');
    const odd = { ...party(), invitation: { cardId: 'disney' as never } };
    expect(resolvedCardId(odd)).toBe('enhjorning');
    expect(sanitizeInvitation({ cardId: 'disney' })).toEqual({});
    expect(sanitizeInvitation({ cardId: 'fotball', whitePaper: true })).toEqual({
      cardId: 'fotball',
      whitePaper: true,
    });
  });

  it('every card has its colours and a calm area that leaves room for the text', () => {
    for (const id of CARD_IDS) {
      const st = CARD_STYLES[id];
      expect(st.id).toBe(id);
      for (const c of [st.pill, st.ink, st.accent, st.whenFill, st.whereFill]) expect(c).toMatch(/^#[0-9A-F]{6}$/);
      expect(100 - st.box.top - st.box.bottom).toBeGreaterThanOrEqual(45);
      expect(100 - 2 * st.box.side).toBeGreaterThanOrEqual(60);
    }
  });
});

describe('the headline', () => {
  it('«Emma fyller 6!» with the age emphasized, the age and «!» kept together', () => {
    const f = cardFace(party(), 'Ola');
    expect(f.headline).toBe('Emma fyller 6!');
    expect(f.headlineHtml).toBe('Emma fyller <span class="bk-nw"><span class="bk-age">6</span>!</span>');
    expect(f.welcome).toBe('Bli med på enhjørningfest!');
    expect(cardFace(party({ theme: null }), null).welcome).toBe('Bli med på bursdagsfest!');
    // brand themes: the neutral words too
    expect(cardFace(party({ theme: 'pokemon' }), null).welcome).toBe('Bli med på bursdagsfest!');
  });

  it('joint parties: «Emma og Jonas fyller 5 og 7!»', () => {
    const f = cardFace(joint(), null);
    expect(f.headline).toBe('Emma og Jonas fyller 5 og 7!');
    expect(f.headlineHtml).toBe(
      'Emma og Jonas fyller <span class="bk-age">5</span> og <span class="bk-nw"><span class="bk-age">7</span>!</span>',
    );
    // twins: the same age is said once
    const twins = party({
      celebrants: [
        { id: 'c1', name: 'Ida', age: 6 },
        { id: 'c2', name: 'Ola', age: 6 },
      ],
    });
    expect(cardFace(twins, null).headline).toBe('Ida og Ola fyller 6!');
  });

  it('long names step down in size (and wrap)', () => {
    expect(headlineSize('Emma fyller 6!')).toBeGreaterThan(headlineSize('Sofie-Marie og Kristoffer fyller 6 og 8!'));
    expect(toNameSize('Ola')).toBeGreaterThan(toNameSize('Maximilian Bjørnstad-Kristiansen'));
  });

  it('English', () => {
    void i18n.changeLanguage('en');
    expect(cardFace(party(), null).headline).toBe('Emma is turning 6!');
    expect(cardFace(joint(), null).headline).toBe('Emma and Jonas are turning 5 and 7!');
    expect(cardFace(party(), null).welcome).toBe('Come to the unicorn party!');
  });
});

describe('date, time and place', () => {
  it('«Lørdag 14. november» · «kl. 15–17», the address as typed, or «Hjemme hos oss»', () => {
    const f = cardFace(withInvitation(party(), { address: 'Storgata 12, 0155 Oslo' }), null);
    expect(f.date).toBe('Lørdag 14. november');
    expect(f.time).toBe('kl. 15–17');
    expect(f.place).toBe('Storgata 12, 0155 Oslo');
    expect(cardFace(party(), null).place).toBe('Hjemme hos oss');
    expect(cardFace(party({ home: { type: 'lokale', garden: null } }), null).place).toBeNull();
  });
});

describe('the extra lines (at most two, picked from the plan)', () => {
  it('only what the plan knows is offered, in a fixed order; allergies always', () => {
    expect(availableInfoLines(party())).toEqual(['menu', 'allergies']);
    const all = withInvitation(party({ home: { type: 'ute', garden: null } }), { siblings: true, parentsHelp: true });
    expect(availableInfoLines(all)).toEqual(['siblings', 'parentsHelp', 'menu', 'outdoor', 'allergies']);
    expect(availableInfoLines(party({ menu: null }))).toEqual(['allergies']);
    // an outdoor game on Program offers «Ta gjerne med klær for å være ute»
    expect(availableInfoLines(party({ programme: { activities: ['stafett'] } }))).toEqual([
      'menu',
      'outdoor',
      'allergies',
    ]);
  });

  it('until she picks: the first two the plan offers; her picks after that, never more than two', () => {
    const p = withInvitation(party(), { siblings: true, parentsHelp: true });
    expect(chosenInfoLines(p)).toEqual(['siblings', 'parentsHelp']);
    const picked = withInvitation(p, { infoLines: ['allergies'] });
    expect(chosenInfoLines(picked)).toEqual(['allergies']);
    expect(chosenInfoLines(withInvitation(p, { infoLines: [] }))).toEqual([]);
    // stored too many or unknown ones (older data, hand edits): cleaned
    expect(sanitizeInvitation({ infoLines: ['menu', 'x', 'siblings', 'allergies'] })?.infoLines).toEqual([
      'siblings',
      'menu',
    ]);
    // a picked line the plan no longer offers is not printed (siblings box unticked)
    const unticked = withInvitation(picked, { infoLines: ['siblings', 'menu'], siblings: false });
    expect(chosenInfoLines(unticked)).toEqual(['menu']);
    expect(MAX_INFO_LINES).toBe(2);
  });

  it('toggling: on, off, and no third line', () => {
    let p = withInvitation(party(), { siblings: true, infoLines: [] });
    p = withInvitation(p, { infoLines: toggleInfoLine(p, 'allergies') });
    expect(chosenInfoLines(p)).toEqual(['allergies']);
    p = withInvitation(p, { infoLines: toggleInfoLine(p, 'siblings') });
    expect(chosenInfoLines(p)).toEqual(['siblings', 'allergies']);
    expect(toggleInfoLine(p, 'menu')).toEqual(['siblings', 'allergies']);
    p = withInvitation(p, { infoLines: toggleInfoLine(p, 'siblings') });
    expect(chosenInfoLines(p)).toEqual(['allergies']);
  });

  it('the words: soft and warm, «velkomne» in the plural, the food from Mat', () => {
    const p = withInvitation(party(), { siblings: true, parentsHelp: true });
    expect(infoLineText(p, 'siblings')).toBe('Søsken er hjertelig velkomne');
    expect(infoLineText(p, 'parentsHelp')).toBe('Foreldre er velkomne til å bli');
    expect(infoLineText(p, 'menu')).toBe('Vi spiser hjemmelaget pizza');
    expect(infoLineText(party({ menu: { kind: 'grillpolser' } }), 'menu')).toBe('Vi spiser grillpølser');
    expect(infoLineText(p, 'outdoor')).toBe('Ta gjerne med klær for å være ute');
    expect(infoLineText(p, 'allergies')).toBe('Si fra om allergier');
    // her own words for «Noe annet» stay as typed; an empty one offers no line
    expect(infoLineText(party({ menu: { kind: 'annet', text: 'Taco' } }), 'menu')).toBe('Vi spiser Taco');
    expect(availableInfoLines(party({ menu: { kind: 'annet', text: ' ' } }))).not.toContain('menu');
    expect(cardFace(withInvitation(p, { infoLines: ['siblings', 'menu'] }), null).info).toEqual([
      'Søsken er hjertelig velkomne',
      'Vi spiser hjemmelaget pizza',
    ]);
    void i18n.changeLanguage('en');
    expect(infoLineText(p, 'siblings')).toBe('Brothers and sisters are very welcome');
  });
});

describe('the reply', () => {
  const full = (o = {}) =>
    withInvitation(party(), { hostNames: 'Kari og Per', phone: '90000000', rsvpBy: '2026-11-07', ...o });

  it('«Svar til Kari og Per (Emmas foreldre)», the phone big, «innen 7. november»', () => {
    const f = cardFace(full({ replyMode: 'ifComing' }), null);
    expect(f.reply).toBe('Svar til Kari og Per (Emmas foreldre)');
    expect(f.replyHtml).toBe('Svar til <b>Kari og Per</b> (Emmas foreldre)');
    expect(f.replyBy).toBe('900 00 000 · innen 7.\u00a0november');
    expect(f.replyByHtml).toBe('<span class="bk-tel">900 00 000</span> · innen 7.\u00a0november');
  });

  it('follows the reply mode («Gi beskjed … hvis dere ikke kommer», the default)', () => {
    const f = cardFace(full(), null);
    expect(f.reply).toBe('Gi beskjed til Kari og Per (Emmas foreldre) hvis dere ikke kommer');
    const bare = cardFace(withInvitation(full(), { hostNames: '' }), null);
    expect(bare.reply).toBe('Gi beskjed hvis dere ikke kommer');
    expect(bare.replyBy).toBe('900 00 000 · innen 7.\u00a0november');
  });

  it("no parents' names: just «Svar til» and the phone; no phone: just the svarfrist", () => {
    const f = cardFace(withInvitation(full({ replyMode: 'ifComing' }), { hostNames: '  ' }), null);
    expect(f.reply).toBe('');
    expect(f.replyBy).toBe('Svar til 900 00 000 · innen 7.\u00a0november');
    const none = cardFace(withInvitation(party(), { replyMode: 'ifComing', rsvpBy: '2026-11-07' }), null);
    expect(none.replyBy).toBe('Svar innen 7.\u00a0november');
    const hostsOnly = cardFace(withInvitation(party(), { hostNames: 'Kari', rsvpBy: '2026-11-07' }), null);
    expect(hostsOnly.replyBy).toBe('Innen 7.\u00a0november');
  });

  it('joint parties and names ending in s', () => {
    expect(cardFace(withInvitation(joint(), { hostNames: 'Kari og Per', replyMode: 'ifComing' }), null).reply).toBe(
      'Svar til Kari og Per (foreldrene til Emma og Jonas)',
    );
    const jonas = party({ celebrants: [{ id: 'c1', name: 'Jonas', age: 7 }] });
    expect(cardFace(withInvitation(jonas, { hostNames: 'Kari', replyMode: 'ifComing' }), null).reply).toBe(
      "Svar til Kari (Jonas' foreldre)",
    );
  });

  it('English', () => {
    void i18n.changeLanguage('en');
    expect(cardFace(full({ replyMode: 'ifComing' }), null).reply).toBe("Reply to Kari og Per (Emma's parents)");
    expect(cardFace(full(), null).reply).toBe("Let Kari og Per (Emma's parents) know if you can't come");
    expect(cardFace(full({ replyMode: 'ifComing' }), null).replyBy).toBe('900 00 000 · by 7\u00a0November');
  });
});

describe('fits the card', () => {
  it('a full card gets slightly smaller letters, a short one keeps its size', () => {
    const st = CARD_STYLES.bursdag;
    const short = cardFace(party(), 'Ola');
    expect(cardScale(short, st)).toBe(1);
    const dense = withInvitation(
      party({
        celebrants: [
          { id: 'c1', name: 'Sofie-Marie', age: 6 },
          { id: 'c2', name: 'Kristoffer', age: 8 },
          { id: 'c3', name: 'Ali', age: 10 },
        ],
      }),
      {
        hostNames: 'Ingrid Marie og Hans Petter',
        phone: '90000000',
        address: 'Bjerkeveien 112 B, leilighet 304, 1358 Jar',
        siblings: true,
      },
    );
    const k = cardScale(cardFace(dense, 'Anna-Karoline Østby Ødegård'), CARD_STYLES['dyr-i-skogen']);
    expect(k).toBeLessThan(1);
    expect(k).toBeGreaterThanOrEqual(0.6);
  });
});
