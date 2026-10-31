import { afterEach, describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import { i18n } from '../../i18n/i18n';
import type { Party } from '../model';
import { withGuestAdded, withGuestStatus } from '../rules/guests';
import { withInvitation } from '../rules/invitation';
import { escapeHtml } from '../rules/printCards';
import {
  buildPrintSheet,
  CARDS_PER_PAGE,
  clampPrintCount,
  defaultPrintCount,
  fillPage,
  MAX_PRINT_CARDS,
  minPrintCount,
  PAPER_CREAM,
  PAPER_WHITE,
  printCards,
  printNames,
  toPages,
} from '../rules/printInvitations';

/** Utskrivbare invitasjoner (Ekaterina, 30 Oct 2026): illustrated A5 cards, two per A4 sheet, made on the device. */
afterEach(() => void i18n.changeLanguage('nb'));

const withNames = (p: Party, ...names: string[]) => names.reduce((q, n) => withGuestAdded(q, n), p);
const cardsIn = (html: string) => (html.match(/class="bk-card"/g) ?? []).length;
const pagesIn = (html: string) => (html.match(/class="bk-page"/g) ?? []).length;

describe('how many cards', () => {
  it('no names: blank cards for the guests in the plan, rounded up to fill the sheet', () => {
    // Emma + 12 guests = 13 children → 12 blank cards, six sheets of two
    const p = emma();
    expect(defaultPrintCount(p)).toBe(12);
    expect(printCards(p)).toEqual(Array(12).fill(null));
    // 9 guests → 10 (fills the last sheet)
    expect(defaultPrintCount(emma({ children: 10 }))).toBe(10);
    // a joint party: the birthday children are not invited to their own party (8 − 2 = 6)
    const joint = emma({
      children: 8,
      celebrants: [
        { id: 'c1', name: 'Emma', age: 5 },
        { id: 'c2', name: 'Jonas', age: 7 },
      ],
    });
    expect(defaultPrintCount(joint)).toBe(6);
  });

  it('names: one card for every name on the list (answers are not looked at), then blanks to fill the sheet', () => {
    let p = withNames(emma(), 'Ola', 'Sara', 'Noah', 'Ida', 'Liam');
    p = withGuestStatus(p, p.guests[1].id, 'no');
    p = withGuestStatus(p, p.guests[2].id, 'yes');
    expect(printNames(p)).toEqual(['Ola', 'Sara', 'Noah', 'Ida', 'Liam']);
    expect(printCards(p)).toEqual(['Ola', 'Sara', 'Noah', 'Ida', 'Liam', null]);
    const four = withNames(emma(), 'A', 'B', 'C', 'D');
    expect(printCards(four)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('she can choose another number, never fewer than the names', () => {
    const p = withNames(emma(), 'Ola', 'Sara', 'Noah');
    expect(minPrintCount(p)).toBe(3);
    expect(printCards(p, 2)).toEqual(['Ola', 'Sara', 'Noah']);
    expect(printCards(p, 6)).toEqual(['Ola', 'Sara', 'Noah', null, null, null]);
    expect(clampPrintCount(emma(), 0)).toBe(1);
    expect(clampPrintCount(emma(), 999)).toBe(MAX_PRINT_CARDS);
    expect(printCards(emma(), 5)).toHaveLength(5);
  });

  it('fills sheets and splits into twos', () => {
    expect(CARDS_PER_PAGE).toBe(2);
    expect(fillPage(1)).toBe(2);
    expect(fillPage(2)).toBe(2);
    expect(fillPage(5)).toBe(6);
    expect(fillPage(0)).toBe(2);
    expect(toPages([1, 2, 3, 4, 5]).map((x) => x.length)).toEqual([2, 2, 1]);
  });
});

describe('the HTML', () => {
  it('one landscape A4 section per two cards, «Til: Ola» and blank cards to write on', () => {
    const p = withNames(emma(), 'Ola', 'Sara', 'Noah');
    const sheet = buildPrintSheet(p);
    expect(sheet.cards).toEqual(['Ola', 'Sara', 'Noah', null]);
    expect(sheet.pages).toBe(2);
    expect(pagesIn(sheet.html)).toBe(2);
    expect(cardsIn(sheet.html)).toBe(4);
    expect(sheet.html).toContain('<span class="bk-to-label">Til:</span>');
    expect(sheet.html).toContain('<span class="bk-name">Ola</span>');
    expect((sheet.body.match(/bk-to-blank/g) ?? []).length).toBe(1);
    expect(sheet.html).toContain('size: A4 landscape');
    expect(sheet.html).toContain('dashed');
    expect(sheet.html.startsWith('<!DOCTYPE html><html lang="nb">')).toBe(true);
    expect(sheet.html).toContain('<meta charset="utf-8">');
    expect(sheet.title).toBe('Bursdagsinvitasjoner fra Emma');
    // the body and the styles on their own (the web print) are the same as in the document
    expect(sheet.html).toContain(sheet.body);
    expect(sheet.html).toContain(sheet.css);
  });

  it('an odd number of cards: the second half of the last sheet stays empty paper', () => {
    const sheet = buildPrintSheet(emma(), { count: 3 });
    expect(cardsIn(sheet.html)).toBe(3);
    expect((sheet.body.match(/bk-card bk-empty/g) ?? []).length).toBe(1);
  });

  it('the drawing: the theme picks the card, the picture comes in as `art`, cream paper by default', () => {
    const p = emma(); // enhjørning
    const sheet = buildPrintSheet(p, { count: 2, art: 'https://x.test/a/enhjorning.webp' });
    expect(sheet.cardId).toBe('enhjorning');
    expect(sheet.body).toContain('data-card="enhjorning"');
    expect(sheet.css).toContain('background-image: url("https://x.test/a/enhjorning.webp")');
    expect(sheet.css).toContain('background-blend-mode: multiply');
    expect(sheet.css).toContain(`background-color: ${PAPER_CREAM}`);
    // a data URI (iPhone/Android) goes in as it is
    const data = buildPrintSheet(p, { count: 2, art: 'data:image/webp;base64,AAAA' });
    expect(data.css).toContain('url("data:image/webp;base64,AAAA")');
    // without a picture (tests, or a read that failed): the same cards on plain paper
    expect(buildPrintSheet(p, { count: 2 }).css).not.toContain('background-image');
    // brand themes and no theme: the «Bursdag» card
    expect(buildPrintSheet(emma({ theme: 'paw-patrol' }), { count: 2 }).cardId).toBe('bursdag');
    expect(buildPrintSheet(emma({ theme: null }), { count: 2 }).cardId).toBe('bursdag');
    // her pick wins
    expect(buildPrintSheet(withInvitation(p, { cardId: 'fotball' }), { count: 2 }).cardId).toBe('fotball');
  });

  it('«Hvit bakgrunn (sparer blekk)»: white paper, the drawing stays', () => {
    const p = withInvitation(emma(), { whitePaper: true });
    const sheet = buildPrintSheet(p, { count: 2, art: 'a.webp' });
    expect(sheet.css).toContain(`background-color: ${PAPER_WHITE}`);
    expect(sheet.css).toContain('background-image: url("a.webp")');
    expect(buildPrintSheet(emma(), { count: 2, whitePaper: true }).css).toContain(`background-color: ${PAPER_WHITE}`);
  });

  it('embeds the app fonts (no download): Bricolage Grotesque and Figtree as base64 WOFF2', () => {
    const sheet = buildPrintSheet(emma(), { count: 2 });
    expect((sheet.css.match(/@font-face/g) ?? []).length).toBe(4);
    expect(sheet.css).toContain("font-family: 'BkDisplay'");
    expect(sheet.css).toContain("font-family: 'BkBody'");
    expect(sheet.css).toContain('data:font/woff2;base64,');
    expect(sheet.css).not.toMatch(/url\((["']?)https?:/);
  });

  it("escapes HTML in names, the address and the parents' names", () => {
    let p = withNames(emma(), '<img src=x onerror=alert(1)>', 'Ola & "Kari"');
    p = withInvitation(p, { address: '<script>alert("hei")</script> vei 1', hostNames: '<b>Kari</b> & Per' });
    const sheet = buildPrintSheet(p);
    expect(sheet.html).not.toContain('<script>');
    expect(sheet.html).not.toContain('<img');
    expect(sheet.html).not.toContain('<b>Kari</b>');
    expect(sheet.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(sheet.html).toContain('Ola &amp; &quot;Kari&quot;');
    expect(sheet.html).toContain('&lt;script&gt;alert(&quot;hei&quot;)&lt;/script&gt; vei 1');
    expect(sheet.html).toContain('<b>&lt;b&gt;Kari&lt;/b&gt; &amp; Per</b>');
    expect(escapeHtml(`<'&">`)).toBe('&lt;&#39;&amp;&quot;&gt;');
  });

  it('long names wrap and step down, never cut off', () => {
    const long = 'Maximilian Bjørnstad-Kristiansen';
    const sheet = buildPrintSheet(withNames(emma(), long));
    expect(sheet.html).toContain(`<span class="bk-name">${long}</span>`);
    expect(sheet.css).toContain('overflow-wrap: anywhere');
    expect(sheet.css).not.toContain('ellipsis');
  });

  it('æøå come through as typed', () => {
    const p = withInvitation(withNames(emma(), 'Åse Øyvind Ærlig'), { address: 'Bjørkeveien 12, Årnes' });
    const sheet = buildPrintSheet(p);
    expect(sheet.html).toContain('Åse Øyvind Ærlig');
    expect(sheet.html).toContain('Bjørkeveien 12, Årnes');
    expect(sheet.html).toContain('Lørdag 7. november');
  });

  it('English: «To:», lang="en" and the English card', () => {
    void i18n.changeLanguage('en');
    const sheet = buildPrintSheet(withNames(emma(), 'Ola'));
    expect(sheet.html.startsWith('<!DOCTYPE html><html lang="en">')).toBe(true);
    expect(sheet.html).toContain('<span class="bk-to-label">To:</span>');
    expect(sheet.html).toContain('Emma is turning <span class="bk-nw"><span class="bk-age">5</span>!</span>');
    expect(sheet.title).toBe('Birthday invitations from Emma');
  });

  it('the same words are worked out once and reused (big lists stay quick), and it is deterministic', () => {
    const p = withNames(emma(), 'Ola', 'Sara');
    expect(buildPrintSheet(p).html).toBe(buildPrintSheet(p).html);
    const many = buildPrintSheet(emma({ children: 41 }), { count: MAX_PRINT_CARDS });
    expect(cardsIn(many.html)).toBe(MAX_PRINT_CARDS);
    expect(many.pages).toBe(MAX_PRINT_CARDS / 2);
  });
});
