import { afterEach, describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import { i18n } from '../../i18n/i18n';
import type { Party } from '../model';
import { withGuestAdded, withGuestStatus } from '../rules/guests';
import { withInvitation, buildInvitation } from '../rules/invitation';
import {
  buildPrintSheet,
  CARDS_PER_PAGE,
  clampPrintCount,
  defaultPrintCount,
  escapeHtml,
  fillPage,
  MAX_PRINT_CARDS,
  minPrintCount,
  printCards,
  printNames,
  printNameSize,
  printDecoration,
  printTextSize,
  toPages,
} from '../rules/printInvitations';

/** Utskrivbare invitasjoner (Ekaterina, 30 Oct 2026): A4, four per page, made on the device. */
afterEach(() => void i18n.changeLanguage('nb'));

const withNames = (p: Party, ...names: string[]) => names.reduce((q, n) => withGuestAdded(q, n), p);
const cardsIn = (html: string) => (html.match(/class="bk-card"/g) ?? []).length;
const pagesIn = (html: string) => (html.match(/class="bk-page"/g) ?? []).length;

describe('how many cards', () => {
  it('no names: blank cards for the guests in the plan, rounded up to fill the page', () => {
    // Emma + 12 guests = 13 children → 12 blank cards, three full pages
    const p = emma();
    expect(defaultPrintCount(p)).toBe(12);
    expect(printCards(p)).toEqual(Array(12).fill(null));
    // 9 guests → 12 (fills the last page)
    expect(defaultPrintCount(emma({ children: 10 }))).toBe(12);
    // a joint party: the birthday children are not invited to their own party
    const joint = emma({
      children: 8,
      celebrants: [
        { id: 'c1', name: 'Emma', age: 5 },
        { id: 'c2', name: 'Jonas', age: 7 },
      ],
    });
    expect(defaultPrintCount(joint)).toBe(8);
  });

  it('names: one card each for every name on the list (answers are not looked at), the rest of the last page blank', () => {
    let p = withNames(emma(), 'Ola', 'Sara', 'Noah', 'Ida', 'Liam');
    p = withGuestStatus(p, p.guests[1].id, 'no');
    p = withGuestStatus(p, p.guests[2].id, 'yes');
    expect(printNames(p)).toEqual(['Ola', 'Sara', 'Noah', 'Ida', 'Liam']);
    expect(printCards(p)).toEqual(['Ola', 'Sara', 'Noah', 'Ida', 'Liam', null, null, null]);
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

  it('fills pages and splits into fours', () => {
    expect(fillPage(1)).toBe(4);
    expect(fillPage(4)).toBe(4);
    expect(fillPage(5)).toBe(8);
    expect(fillPage(0)).toBe(4);
    expect(toPages([1, 2, 3, 4, 5, 6, 7, 8, 9]).map((x) => x.length)).toEqual([4, 4, 1]);
    expect(CARDS_PER_PAGE).toBe(4);
  });
});

describe('the HTML', () => {
  it('one section per A4 page, one card per entry, «Til: Ola» and blank lines', () => {
    const p = withNames(emma(), 'Ola', 'Sara', 'Noah', 'Ida', 'Liam');
    const sheet = buildPrintSheet(p);
    expect(sheet.cards).toEqual(['Ola', 'Sara', 'Noah', 'Ida', 'Liam', null, null, null]);
    expect(sheet.pages).toBe(2);
    expect(pagesIn(sheet.html)).toBe(2);
    expect(cardsIn(sheet.html)).toBe(8);
    expect(sheet.html).toContain('<span class="bk-to-label">Til:</span>');
    expect(sheet.html).toContain('>Ola</span>');
    expect((sheet.body.match(/bk-to-blank/g) ?? []).length).toBe(3);
    expect(sheet.html).toContain('size: A4');
    expect(sheet.html.startsWith('<!DOCTYPE html><html lang="nb">')).toBe(true);
    expect(sheet.html).toContain('<meta charset="utf-8">');
    expect(sheet.title).toBe('Bursdagsinvitasjoner fra Emma');
    // the body and the styles on their own (the web print) are the same as in the document
    expect(sheet.html).toContain(sheet.body);
    expect(sheet.html).toContain(sheet.css);
  });

  it('carries the invitation text, including her own edits, and the theme', () => {
    const p = emma();
    const inv = buildInvitation(p);
    const sheet = buildPrintSheet(p, { count: 4 });
    expect(sheet.html).toContain(escapeHtml(inv.text.split('\n')[1]));
    expect(sheet.html).toContain('🦄');
    const edited = withInvitation(p, { customText: 'Velkommen til Emma på lørdag!\nVi gleder oss – æøå ÆØÅ' });
    const e = buildPrintSheet(edited, { count: 4 });
    expect(e.html).toContain('Velkommen til Emma på lørdag!\nVi gleder oss – æøå ÆØÅ');
    expect(e.html).not.toContain(inv.text.split('\n')[1]);
    // without a theme: the neutral look and the balloon
    const plain = buildPrintSheet(emma({ theme: null }), { count: 4 });
    expect(plain.html).toContain('🎈');
    expect(plain.html).toContain('#F7E6EE');
  });

  it('escapes HTML in names and in her text', () => {
    let p = withNames(emma(), '<img src=x onerror=alert(1)>', 'Ola & "Kari"');
    p = withInvitation(p, { customText: '<script>alert("hei")</script> & velkommen' });
    const sheet = buildPrintSheet(p);
    expect(sheet.html).not.toContain('<script>');
    expect(sheet.html).not.toContain('<img');
    expect(sheet.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(sheet.html).toContain('Ola &amp; &quot;Kari&quot;');
    expect(sheet.html).toContain('&lt;script&gt;alert(&quot;hei&quot;)&lt;/script&gt; &amp; velkommen');
    expect(escapeHtml(`<'&">`)).toBe('&lt;&#39;&amp;&quot;&gt;');
  });

  it('long names wrap and step down, never cut off', () => {
    const long = 'Maximilian Bjørnstad-Kristiansen';
    const sheet = buildPrintSheet(withNames(emma(), long));
    expect(sheet.html).toContain(`>${long}</span>`);
    expect(sheet.css).toContain('overflow-wrap: anywhere');
    expect(sheet.css).not.toContain('ellipsis');
    expect(printNameSize(long)).toBeLessThan(printNameSize('Ola'));
  });

  it('a long own text gets a smaller size so it still fits the card', () => {
    expect(printTextSize('kort')).toBeGreaterThan(printTextSize('x'.repeat(1800)));
    expect(printTextSize('x'.repeat(5000))).toBeGreaterThanOrEqual(0.9);
  });

  it('English: «To:», lang="en" and the English text', () => {
    void i18n.changeLanguage('en');
    const sheet = buildPrintSheet(withNames(emma(), 'Ola'));
    expect(sheet.html.startsWith('<!DOCTYPE html><html lang="en">')).toBe(true);
    expect(sheet.html).toContain('<span class="bk-to-label">To:</span>');
    expect(sheet.html).toContain('Emma is turning 5');
    expect(sheet.title).toBe('Birthday invitations from Emma');
  });

  it('the decoration hook: theme emoji and colours today; a frame and fonts slot in when given', () => {
    expect(printDecoration('enhjorning').emoji).toBe('🦄');
    expect(printDecoration(null)).toEqual({ emoji: '🎈', tint: '#F7E6EE', ink: '#7A5A6D' });
    expect(buildPrintSheet(emma(), { count: 4 }).body).not.toContain('bk-frame');
    const sheet = buildPrintSheet(emma(), {
      count: 4,
      decoration: { ...printDecoration(null), frameSvg: '<svg viewBox="0 0 10 10"></svg>', fontCss: '@font-face{}' },
    });
    expect((sheet.body.match(/class="bk-frame"/g) ?? []).length).toBe(4);
    expect(sheet.css.startsWith('@font-face{}')).toBe(true);
  });

  it('is deterministic', () => {
    const p = withNames(emma(), 'Ola', 'Sara');
    expect(buildPrintSheet(p).html).toBe(buildPrintSheet(p).html);
  });
});
