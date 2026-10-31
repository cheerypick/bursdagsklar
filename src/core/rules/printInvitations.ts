/**
 * Utskrivbare invitasjoner (Ekaterina, 30 Oct 2026): illustrated A5 cards, two on each A4 sheet (landscape,
 * side by side, a dashed line to cut along), made on the device as ONE HTML document. No server, no AI:
 * expo-print turns it into a PDF on iPhone/Android, and the browser's own print dialog does it on the web
 * (src/features/printInvitations.ts).
 *
 * - The card: a drawing per theme (./printCards.ts picks it; the picture comes in as `art`, a URL on the web
 *   or a data URI in the app) with the party's details on top, filled in from the plan (`cardFace`).
 * - Names come from the Gjesteliste: one card per name on it (answers come later, so they are not looked at),
 *   then blank «Til: ________» cards to fill the last sheet. With no names: blank cards for the guests in the
 *   plan (the children number minus the birthday children), rounded up to whole sheets. She can softly choose
 *   another number.
 * - Paper: a warm cream by default; «Hvit bakgrunn (sparer blekk)» prints white paper. The drawing is stored on
 *   white and the cream is laid over it (multiply), so the same picture serves both.
 * - Fonts: the app's own (Bricolage Grotesque + Figtree), embedded as base64 (./printFonts.ts), so nothing is
 *   downloaded and æøå are always right.
 * - Sizes are relative to the card (container units, mm as the fallback), so the document fits the page
 *   whether the PDF is made on an iPhone, on Android or in the browser's print dialog.
 * - Every text from the party is HTML-escaped (a name like «<b>Ola</b>» prints as typed).
 */
import type { CardId, ISODate, Party } from '../model';
import { t, language } from '../../i18n/i18n';
import { celebrantNames } from './celebrants';
import { MAX_CHILDREN } from './constants';
import {
  CARD_STYLES,
  cardFace,
  cardScale,
  escapeHtml,
  headlineSize,
  resolvedCardId,
  toNameSize,
  type CardFace,
  type CardStyle,
} from './printCards';
import { PRINT_BODY_FONT, PRINT_DISPLAY_FONT, PRINT_FONT_CSS } from './printFonts';

/** Two A5 invitations on one A4 sheet (landscape, side by side). */
export const CARDS_PER_PAGE = 2;
/** The most cards one print can hold (the most children a party can have, rounded up to whole sheets). */
export const MAX_PRINT_CARDS = Math.ceil(MAX_CHILDREN / CARDS_PER_PAGE) * CARDS_PER_PAGE;
/** The paper colours: warm cream (default) or white («Hvit bakgrunn»). */
export const PAPER_CREAM = '#FBF5E8';
export const PAPER_WHITE = '#FFFFFF';

/** Rounds up to whole sheets: 5 → 6. Never below one sheet. */
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
 * How many cards to print by default. With names: the names, rounded up so the last sheet is full (the extra
 * card is blank). Without names: the guests in the plan (children minus birthday children), rounded up.
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

/** Splits the cards into A4 sheets of two. */
export function toPages<T>(cards: readonly T[]): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < cards.length; i += CARDS_PER_PAGE) pages.push(cards.slice(i, i + CARDS_PER_PAGE));
  return pages;
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
  /** The card (drawing) used. */
  cardId: CardId;
  /** «Bursdagsinvitasjoner fra Emma»: the document title (the file name the browser suggests). */
  title: string;
}

export interface PrintOptions {
  /** How many cards (defaults to `defaultPrintCount`). */
  count?: number;
  today?: ISODate;
  /**
   * The drawing for the card: a URL (web) or a data URI (iOS/Android, so the PDF needs no files). Without it
   * the cards print on plain paper with the same text (and the unit tests need no pictures).
   */
  art?: string;
  /** Another card than the party's (`resolvedCardId`). */
  cardId?: CardId;
  /** White paper instead of cream. Defaults to the party's «Hvit bakgrunn» choice. */
  whitePaper?: boolean;
}

/** The size of a text in percent of the card width, mm first for browsers without container units. */
const size = (n: number) => `font-size: ${(n * 1.485).toFixed(2)}mm; font-size: ${n.toFixed(2)}cqw`;

function cardHtml(face: CardFace, style: CardStyle): string {
  const k = cardScale(face, style);
  const s = (n: number) => size(n * k);
  const to = escapeHtml(t('print.to'));
  const toLine =
    face.name === null
      ? `<div class="bk-to bk-to-blank" style="${s(3.4)}"><span class="bk-to-label">${to}</span><span class="bk-line"></span></div>`
      : `<div class="bk-to" style="${s(toNameSize(face.name))}"><span class="bk-to-label">${to}</span> <span class="bk-name">${escapeHtml(face.name)}</span></div>`;
  const place = face.place ? `<div class="bk-pill bk-where" style="${s(3.15)}">${escapeHtml(face.place)}</div>` : '';
  const info = face.info.length
    ? `<div class="bk-infos" style="${s(2.85)}">${face.info.map((x) => `<div class="bk-info">${escapeHtml(x)}</div>`).join('')}</div>`
    : '';
  return [
    `<div class="bk-card" data-card="${style.id}">`,
    '<div class="bk-txt">',
    toLine,
    `<h1 class="bk-h" style="${s(headlineSize(face.headline))}">${face.headlineHtml}</h1>`,
    `<div class="bk-welcome" style="${s(3.6)}">${escapeHtml(face.welcome)}</div>`,
    `<div class="bk-pill bk-when" style="${s(3.15)}"><b>${escapeHtml(face.date)}</b> · ${escapeHtml(face.time)}</div>`,
    place,
    info,
    `<div class="bk-svar">${face.replyHtml ? `<div class="bk-svar1" style="${s(3)}">${face.replyHtml}</div>` : ''}<div class="bk-svar2" style="${s(3)}">${face.replyByHtml}</div></div>`,
    '</div></div>',
  ].join('');
}

/** Builds the printable sheet: one HTML document, two cards per A4 sheet. */
export function buildPrintSheet(p: Party, opts: PrintOptions = {}): PrintSheet {
  const cardId = opts.cardId ?? resolvedCardId(p);
  const style = CARD_STYLES[cardId];
  const white = opts.whitePaper ?? Boolean(p.invitation?.whitePaper);
  const cards = printCards(p, opts.count);
  const pages = toPages(cards);
  const title = t('print.docTitle', { names: celebrantNames(p.celebrants) });
  // the same words on every card but the name: worked out once
  const faces = new Map<string | null, string>();
  const one = (name: string | null) => {
    if (!faces.has(name)) faces.set(name, cardHtml(cardFace(p, name), style));
    return faces.get(name) as string;
  };
  const body = pages
    .map(
      (cs) =>
        `<section class="bk-page">${cs.map(one).join('')}${cs.length < CARDS_PER_PAGE ? '<div class="bk-card bk-empty"></div>' : ''}</section>`,
    )
    .join('');
  const css = `${PRINT_FONT_CSS}\n${sheetCss(style, white ? PAPER_WHITE : PAPER_CREAM, opts.art)}`;
  const html = `<!DOCTYPE html><html lang="${language()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
  return { html, css, body, cards, pages: pages.length, cardId, title };
}

const DISPLAY = `"${PRINT_DISPLAY_FONT}", "Avenir Next", "Trebuchet MS", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
const BODY = `"${PRINT_BODY_FONT}", "Avenir Next", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

/** A URL for CSS: quotes and backslashes escaped (a data URI or a bundled asset path). */
const cssUrl = (u: string) => `url("${u.replace(/["\\\n\r]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `)}")`;

/**
 * The print styles. The sheet is the full printable width with the A4 landscape ratio, so it fits whatever the
 * printer's margins are; each card is a size container, and everything on it is sized in percent of its width.
 */
function sheetCss(st: CardStyle, paper: string, art?: string): string {
  const b = st.box;
  return [
    '@page { size: A4 landscape; margin: 0; }',
    'html, body { margin: 0; padding: 0; background: #fff; }',
    '.bk-page { position: relative; box-sizing: border-box; width: 100%; aspect-ratio: 297 / 209; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); overflow: hidden; background: #fff; break-after: page; page-break-after: always; break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    '.bk-page:last-child { break-after: auto; page-break-after: auto; }',
    // the cut line down the middle
    '.bk-page::after { content: ""; position: absolute; left: 50%; top: 0; bottom: 0; border-left: 0.3mm dashed #9a9a9a; pointer-events: none; z-index: 2; }',
    `.bk-card { position: relative; box-sizing: border-box; min-width: 0; min-height: 0; overflow: hidden; container-type: size; background-color: ${paper}; ${art ? `background-image: ${cssUrl(art)}; background-size: 100% 100%; background-repeat: no-repeat; background-blend-mode: multiply;` : ''} -webkit-print-color-adjust: exact; print-color-adjust: exact; color: ${st.ink}; font-family: ${BODY}; }`,
    '.bk-empty { background: #fff; }',
    `.bk-txt { position: absolute; top: ${b.top}%; bottom: ${b.bottom}%; left: ${b.side}%; right: ${b.side}%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 3.1mm; gap: 2.1cqw; }`,
    `.bk-to { display: inline-flex; align-items: baseline; flex-wrap: wrap; justify-content: center; column-gap: 0.35em; max-width: 92%; box-sizing: border-box; background: ${st.pill}; color: #fff; font-weight: 800; letter-spacing: 0.01em; line-height: 1.2; padding: 0.3em 1.3em 0.36em; border-radius: 1.2em; }`,
    '.bk-to-label { font-weight: 600; }',
    '.bk-name { min-width: 0; overflow-wrap: anywhere; word-break: break-word; }',
    `.bk-to-blank { background: rgba(255, 255, 255, 0.7); color: ${st.ink}; border: 0.35mm solid ${st.pill}; width: 74%; flex-wrap: nowrap; }`,
    `.bk-to-blank .bk-line { flex: 1; min-width: 40%; height: 0; border-bottom: 0.3mm solid ${st.ink}; transform: translateY(-0.15em); }`,
    `.bk-h { margin: 0.6mm 0 0; margin: 0.4cqw 0 0; font-family: ${DISPLAY}; font-weight: 800; color: ${st.ink}; line-height: 1.04; letter-spacing: -0.01em; overflow-wrap: anywhere; word-break: break-word; }`,
    '.bk-nw { white-space: nowrap; }',
    `.bk-age { display: inline-block; color: ${st.accent}; font-size: 1.24em; line-height: 0.9; }`,
    '.bk-welcome { font-weight: 600; line-height: 1.3; margin-bottom: 0.3em; overflow-wrap: anywhere; }',
    `.bk-pill { font-weight: 600; line-height: 1.3; padding: 0.42em 1.25em; border-radius: 1.4em; border: 0.25mm solid ${st.ink}40; max-width: 96%; box-sizing: border-box; overflow-wrap: anywhere; }`,
    '.bk-pill b { font-weight: 800; }',
    `.bk-when { background: ${st.whenFill}; } .bk-where { background: ${st.whereFill}; }`,
    '.bk-infos { line-height: 1.4; margin-top: 0.2em; }',
    `.bk-info { overflow-wrap: anywhere; } .bk-info::before { content: ""; display: inline-block; width: 0.42em; height: 0.42em; border-radius: 50%; background: ${st.accent}; margin-right: 0.45em; transform: translateY(-0.12em); }`,
    `.bk-svar { width: 90%; margin-top: 0.4mm; padding-top: 2.6mm; padding-top: 1.8cqw; border-top: 0.45mm dashed ${st.accent}; line-height: 1.35; }`,
    '.bk-svar1 { overflow-wrap: anywhere; } .bk-svar1 b { font-weight: 800; }',
    '.bk-svar2 { font-weight: 600; margin-top: 0.25em; }',
    '.bk-tel { font-weight: 800; font-size: 1.4em; letter-spacing: 0.02em; white-space: nowrap; }',
  ].join('\n');
}
