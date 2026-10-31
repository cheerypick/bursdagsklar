/**
 * Utskrivbare invitasjoner (Oct 2026), from Ekaterina's wish (30 Oct: «maybe I want the printable
 * invitations … Can we do this without backend?»). Pure and deterministic: one HTML document is built on the
 * device from the party, no AI, no network, no server.
 *
 * - A4 portrait, four invitations per page (2 × 2) with faint dashed cut lines between them.
 * - Each card: «Til: Ola» (or a blank «Til: ________» line to write on), the theme's emoji and headline in the
 *   theme's colours (no theme: the app's own neutral look), and the party's invitation text exactly as on
 *   Invitasjon, her own edits included.
 * - Names come from the Gjesteliste: every name on it (answers come later, so they are not looked at). The rest of the last page is filled
 *   with blank cards. With no names: blank cards for the guests in the plan (the children number minus the
 *   birthday children), rounded up to fill the page. She can softly choose another number.
 * - Prints well in black and white: dark text on white, only light tints behind the headline.
 * - Sizes are relative to the page (container units, mm as the fallback), so the same document fits the
 *   page whether the PDF is made on an iPhone, on Android or in the browser's print dialog.
 * - Fonts: the app's own fonts when the browser has them loaded (web), otherwise safe system fonts that all
 *   carry æ, ø and å. Nothing is downloaded.
 * - Every text from the party is HTML-escaped (a name like «<b>Ola</b>» prints as typed).
 */
import type { Party, ISODate, ThemeId } from '../model';
import { themeById, THEMES, BRAND_PALETTE } from '../themes';
import { t, language } from '../../i18n/i18n';
import { buildInvitation } from './invitation';
import { invitationCard } from '../texts/render';
import { celebrantNames } from './celebrants';
import { MAX_CHILDREN } from './constants';

/** Four invitations on one A4 page, two by two. */
export const CARDS_PER_PAGE = 4;
/** The most cards one print can hold (the most children a party can have, rounded up to whole pages). */
export const MAX_PRINT_CARDS = Math.ceil(MAX_CHILDREN / CARDS_PER_PAGE) * CARDS_PER_PAGE;

/** Rounds up to whole pages: 9 → 12. Never below one page. */
export function fillPage(n: number): number {
  return Math.max(1, Math.ceil(Math.max(1, n) / CARDS_PER_PAGE)) * CARDS_PER_PAGE;
}

/**
 * The names that get their own card: everyone on the Gjesteliste, in list order. The answers (Kommer /
 * Kommer ikke) come after the invitations are handed out, so printing does not look at them (Ekaterina,
 * 30 Oct 2026).
 */
export function printNames(p: Pick<Party, 'guests'>): string[] {
  return p.guests.map((g) => g.name);
}

/**
 * How many cards to print by default. With names: the names, rounded up so the last page is full (the extra
 * cards are blank). Without names: the guests in the plan (children minus birthday children), rounded up.
 */
export function defaultPrintCount(p: Pick<Party, 'guests' | 'children' | 'celebrants'>): number {
  const names = printNames(p).length;
  const guests = Math.max(1, p.children - p.celebrants.length);
  return Math.min(MAX_PRINT_CARDS, fillPage(names || guests));
}

/** The smallest number she can choose: one card per name (at least one card). */
export function minPrintCount(p: Pick<Party, 'guests'>): number {
  return Math.max(1, printNames(p).length);
}

/** Keeps a chosen number between one card per name and MAX_PRINT_CARDS. */
export function clampPrintCount(p: Pick<Party, 'guests'>, n: number): number {
  const min = minPrintCount(p);
  return Math.min(Math.max(min, MAX_PRINT_CARDS), Math.max(min, Math.round(n) || min));
}

/** One entry per card: the child's name, or null for a blank «Til: ____» card. */
export function printCards(p: Pick<Party, 'guests' | 'children' | 'celebrants'>, count?: number): (string | null)[] {
  const names = printNames(p);
  const n = clampPrintCount(p, count ?? defaultPrintCount(p));
  return Array.from({ length: n }, (_, i) => names[i] ?? null);
}

/** Splits the cards into A4 pages of four. */
export function toPages<T>(cards: readonly T[]): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < cards.length; i += CARDS_PER_PAGE) pages.push(cards.slice(i, i + CARDS_PER_PAGE));
  return pages;
}

/** HTML-escapes text from the party (names, the edited invitation text, the address …). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The text sizes tried on the card, largest first (percent of the page width; 2.0 ≈ 12 pt on A4). */
const TEXT_SIZES = [2.2, 2.05, 1.9, 1.75, 1.6, 1.45, 1.3, 1.15, 1.0, 0.9];
/** The room for the text on one card, in mm (a card is 105 × 148.5 mm; padding, «Til:» and the band take the rest). */
const TEXT_WIDTH_MM = 89;
const TEXT_HEIGHT_MM = 86;

/**
 * The invitation text's size on the card: the largest size where the text, wrapped, fits the card, so a long
 * own edit still fits. A deliberately rough estimate (an average letter is about half the font size wide),
 * the same on every device. Deterministic.
 */
export function printTextSize(text: string): number {
  const rows = text.split('\n');
  for (const size of TEXT_SIZES) {
    const mm = size * 2.1;
    const perLine = Math.max(10, Math.floor(TEXT_WIDTH_MM / (0.5 * mm)));
    const lines = rows.reduce((n, r) => n + Math.max(1, Math.ceil(r.trim().length / perLine)), 0);
    if (lines * 1.3 * mm <= TEXT_HEIGHT_MM) return size;
  }
  return TEXT_SIZES[TEXT_SIZES.length - 1];
}

/** The size of the «Til:» name: long names step down and wrap, never cut off. */
export function printNameSize(name: string): number {
  const len = name.trim().length;
  if (len <= 14) return 3.1;
  if (len <= 24) return 2.6;
  return 2.2;
}

export interface PrintSheet {
  /** The whole document (expo-print on iOS/Android). */
  html: string;
  /** The styles and the pages on their own (the web adds them to the page and opens the print dialog). */
  css: string;
  body: string;
  /** One entry per card: a name, or null for a blank card. */
  cards: (string | null)[];
  pages: number;
  /** «Invitasjoner til Emmas bursdag»: the document title (the file name the browser suggests). */
  title: string;
}

export interface PrintOptions {
  /** How many cards (defaults to `defaultPrintCount`). */
  count?: number;
  today?: ISODate;
  /** Another decoration than the party's theme gives (`printDecoration`). */
  decoration?: PrintDecoration;
}

/**
 * What decorates the cards. Today (MVP): the theme's emoji and its invitation colours; no theme: the balloon
 * and the app's own colours. This is the hook for the design that comes later: an illustrated frame per theme
 * (inline SVG, no external images) and display fonts (embedded @font-face) are drawn by `buildPrintSheet`
 * when a decoration carries them. None does yet.
 */
export interface PrintDecoration {
  emoji: string;
  /** Light fill behind the headline. */
  tint: string;
  /** Headline colour. */
  ink: string;
  /** An inline SVG drawn over the whole card, behind nothing that must be read (pointer-free, decorative). */
  frameSvg?: string;
  /** @font-face rules for a display font, added before the styles. */
  fontCss?: string;
}

export function printDecoration(themeId: ThemeId | null | undefined): PrintDecoration {
  const theme = themeId && THEMES.some((x) => x.id === themeId) ? themeById(themeId) : null;
  const palette = theme ? theme.palette : BRAND_PALETTE;
  return { emoji: theme ? theme.emoji : '🎈', tint: palette.inviteTint, ink: palette.inviteInk };
}

/** Builds the printable sheet: one HTML document, four cards per A4 page. */
export function buildPrintSheet(p: Party, opts: PrintOptions = {}): PrintSheet {
  const inv = buildInvitation(p, opts.today);
  const card = invitationCard(p);
  const deco = opts.decoration ?? printDecoration(p.theme);
  const cards = printCards(p, opts.count);
  const pages = toPages(cards);
  const title = t('print.docTitle', { names: celebrantNames(p.celebrants) });
  const textSize = printTextSize(inv.text);
  const to = escapeHtml(t('print.to'));
  // mm first for browsers without container units, then the page-relative size
  const size = (n: number) => `font-size: ${(n * 2.1).toFixed(2)}mm; font-size: ${n}cqw`;

  const cardHtml = (name: string | null) => {
    const toLine =
      name === null
        ? `<div class="bk-to bk-to-blank"><span class="bk-to-label">${to}</span><span class="bk-line"></span></div>`
        : `<div class="bk-to"><span class="bk-to-label">${to}</span> <span class="bk-name" style="${size(printNameSize(name))}">${escapeHtml(name)}</span></div>`;
    const frame = deco.frameSvg ? `<div class="bk-frame" aria-hidden="true">${deco.frameSvg}</div>` : '';
    return `<div class="bk-card">${frame}${toLine}<div class="bk-band"><div class="bk-emoji">${deco.emoji}</div><div class="bk-headline">${escapeHtml(card.headline)}</div><div class="bk-hero">${escapeHtml(`${card.name} ${card.line}`)}</div></div><div class="bk-text" style="${size(textSize)}">${escapeHtml(inv.text)}</div></div>`;
  };
  const body = pages.map((cs) => `<section class="bk-page">${cs.map(cardHtml).join('')}</section>`).join('');
  const css = `${deco.fontCss ?? ''}${sheetCss(deco.tint, deco.ink)}`;
  const html = `<!DOCTYPE html><html lang="${language()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
  return { html, css, body, cards, pages: pages.length, title };
}

const DISPLAY =
  '"BricolageGrotesque_800ExtraBold", "Avenir Next", "Trebuchet MS", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const BODY = '"Figtree_400Regular", "Avenir Next", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/**
 * The print styles. The page box is the full printable width with the A4 ratio, so it fits whatever the
 * printer's margins are; everything inside is sized in percent of that width (cqw), with mm as the fallback.
 */
function sheetCss(tint: string, ink: string): string {
  return [
    '@page { size: A4 portrait; margin: 0; }',
    'html, body { margin: 0; padding: 0; background: #fff; }',
    `.bk-page { position: relative; box-sizing: border-box; width: 100%; aspect-ratio: 210 / 296; min-height: 0; container-type: inline-size; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) minmax(0, 1fr); overflow: hidden; background: #fff; color: #1d1d1b; break-after: page; page-break-after: always; break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }`,
    '.bk-page:last-child { break-after: auto; page-break-after: auto; }',
    // the faint cut lines: one down the middle, one across
    '.bk-page::before, .bk-page::after { content: ""; position: absolute; pointer-events: none; }',
    '.bk-page::before { left: 50%; top: 0; bottom: 0; border-left: 0.6px dashed #a8a8a8; }',
    '.bk-page::after { top: 50%; left: 0; right: 0; border-top: 0.6px dashed #a8a8a8; }',
    `.bk-card { position: relative; box-sizing: border-box; min-width: 0; min-height: 0; overflow: hidden; padding: 8.4mm 8mm; padding: 4cqw 3.8cqw; display: flex; flex-direction: column; gap: 2.5mm; gap: 1.2cqw; font-family: ${BODY}; }`,
    '.bk-frame { position: absolute; inset: 0; pointer-events: none; } .bk-frame svg { width: 100%; height: 100%; display: block; }',
    '.bk-card > :not(.bk-frame) { position: relative; }',
    `.bk-to { font-family: ${BODY}; font-size: 4.2mm; font-size: 2cqw; color: #1d1d1b; display: flex; align-items: baseline; flex-wrap: wrap; column-gap: 1.6mm; column-gap: 0.8cqw; line-height: 1.15; min-height: 7.4mm; min-height: 3.5cqw; }`,
    '.bk-to-label { font-weight: 600; }',
    `.bk-name { font-family: ${DISPLAY}; font-weight: 800; color: #1d1d1b; min-width: 0; overflow-wrap: anywhere; word-break: break-word; line-height: 1.1; }`,
    '.bk-to-blank .bk-line { flex: 1; min-width: 40%; height: 1px; border-bottom: 1px solid #555; transform: translateY(-0.2em); }',
    `.bk-band { background: ${tint}; border: 1px solid ${ink}33; border-radius: 4.2mm; border-radius: 2cqw; padding: 2.5mm 3mm; padding: 1.2cqw 1.5cqw; text-align: center; }`,
    '.bk-emoji { font-size: 7mm; font-size: 3.4cqw; line-height: 1.35; margin-bottom: 0.6mm; margin-bottom: 0.3cqw; }',
    `.bk-hero { font-family: ${DISPLAY}; font-weight: 800; color: #1d1d1b; font-size: 6.3mm; font-size: 3cqw; line-height: 1.1; margin-top: 0.8mm; margin-top: 0.4cqw; overflow-wrap: anywhere; }`,
    `.bk-headline { font-family: ${DISPLAY}; font-weight: 800; color: ${ink}; font-size: 4.2mm; font-size: 2cqw; line-height: 1.15; overflow-wrap: anywhere; }`,
    `.bk-text { white-space: pre-line; overflow-wrap: anywhere; line-height: 1.32; color: #1d1d1b; flex: 1; min-height: 0; overflow: hidden; }`,
  ].join('\n');
}
