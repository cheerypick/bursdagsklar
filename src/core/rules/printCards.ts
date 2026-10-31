/**
 * The illustrated printed cards (Ekaterina, 30 Oct 2026: «all the info we gathered – now it's the time to use
 * it!»). Pure and deterministic: what goes on one A5 card, filled in from the plan. The HTML is drawn in
 * ./printInvitations.ts; the drawings themselves are bundled pictures (assets/images/invite/<card>.webp,
 * made once in advance, no AI in the app).
 *
 * On the card, top to bottom: «Til: Ola» (or «Til: ________» to write on), «Emma fyller 6!» (the age
 * bigger), a short welcome line, the date and time, the address, up to two extra lines from the plan
 * (siblings, parents who stay, the food, clothes for outdoors, allergies), then a dashed line and the reply:
 * «Svar til Kari og Per (Emmas foreldre)», the phone number big, and the svarfrist.
 */
import type { CardId, InfoLineId, Party, ThemeId } from '../model';
import { THEMES } from '../themes';
import { t, joinList, language } from '../../i18n/i18n';
import { capitalize, formatDayMonth, formatLong, formatRangeCompact } from './dates';
import { celebrantNames } from './celebrants';
import { CARD_IDS, formatPhone, INFO_LINE_IDS, MAX_INFO_LINES, resolveInvitation } from './invitation';
import { menuTitle } from './menu';
import { pickedActivities } from './programme';
import { activityById } from './activities';
import { genitive } from '../texts/render';

/** The colours printed on a card, chosen to sit with its drawing and to stay dark enough in black and white. */
export interface CardStyle {
  id: CardId;
  /** The «Til:» pill (white text on it). */
  pill: string;
  /** All text on the card. */
  ink: string;
  /** The age in the headline, the dashed line and the dots before the extra lines. */
  accent: string;
  /** Behind the date and time. */
  whenFill: string;
  /** Behind the address. */
  whereFill: string;
  /**
   * The calm area of the drawing the text sits in, in percent of the card: from the top, from the bottom and
   * from each side. Measured on each drawing so no line runs into the decoration.
   */
  box: { top: number; bottom: number; side: number };
}

export const CARD_STYLES: Readonly<Record<CardId, CardStyle>> = {
  bursdag: {
    id: 'bursdag',
    pill: '#1F3D36',
    ink: '#1F3D36',
    accent: '#B8436A',
    whenFill: '#F7DCE5',
    whereFill: '#DCE8D8',
    box: { top: 21, bottom: 21, side: 14 },
  },
  enhjorning: {
    id: 'enhjorning',
    pill: '#7E5BA8',
    ink: '#3E2E5C',
    accent: '#9257B8',
    whenFill: '#ECE2F6',
    whereFill: '#F7DFE3',
    box: { top: 20, bottom: 31, side: 18 },
  },
  dinosaurer: {
    id: 'dinosaurer',
    pill: '#4A6B3F',
    ink: '#2D4528',
    accent: '#C0613A',
    whenFill: '#E0EBD6',
    whereFill: '#F6E6CF',
    box: { top: 21, bottom: 22, side: 16 },
  },
  verdensrommet: {
    id: 'verdensrommet',
    pill: '#34437A',
    ink: '#25305A',
    accent: '#C0553F',
    whenFill: '#E0E5F4',
    whereFill: '#F6E5D0',
    box: { top: 21, bottom: 24, side: 15 },
  },
  fotball: {
    id: 'fotball',
    pill: '#2F5A37',
    ink: '#22402A',
    accent: '#C24E3C',
    whenFill: '#DDEBD8',
    whereFill: '#F4E7CF',
    box: { top: 20, bottom: 27, side: 16 },
  },
  'dyr-i-skogen': {
    id: 'dyr-i-skogen',
    pill: '#7C4E2A',
    ink: '#4E3420',
    accent: '#C0602C',
    whenFill: '#F3E3D0',
    whereFill: '#E0EAD5',
    box: { top: 21, bottom: 28, side: 19 },
  },
};

/** The card for a theme: its own drawing when we have one; «Bursdag» without a theme and for brand themes. */
export function cardForTheme(themeId: ThemeId | null | undefined): CardId {
  const theme = themeId ? THEMES.find((x) => x.id === themeId) : undefined;
  if (!theme || theme.licensed) return 'bursdag';
  return (CARD_IDS as readonly string[]).includes(theme.id) ? (theme.id as CardId) : 'bursdag';
}

/** The card that prints: the one she picked, otherwise the theme's card. */
export function resolvedCardId(p: Pick<Party, 'theme' | 'invitation'>): CardId {
  const picked = p.invitation?.cardId;
  return picked && (CARD_IDS as readonly string[]).includes(picked) ? picked : cardForTheme(p.theme);
}

/** The card's name in the picker («Enhjørning»). */
export const cardName = (id: CardId) => t(`print.cards.${id}`);

// ---------- the extra lines ----------

/** «Vi spiser grillpølser»: the food from Mat, or null while nothing is chosen. */
function menuLine(p: Pick<Party, 'menu'>): string | null {
  const m = p.menu;
  if (!m) return null;
  if (m.kind === 'annet' && !m.text.trim()) return null;
  const title = menuTitle(m).trim();
  if (!title) return null;
  // «Grillpølser» → «grillpølser» inside the sentence; her own words («Noe annet», own dish) stay as typed
  const own = m.kind === 'annet' || m.kind === 'egen';
  const food = own ? title : title.charAt(0).toLocaleLowerCase(language()) + title.slice(1);
  return t('print.info.menu', { food });
}

/** An outdoor game is picked on Program, or the party is outside. */
function outdoorPlanned(p: Pick<Party, 'programme' | 'home'>): boolean {
  if (p.home.type === 'ute') return true;
  return pickedActivities(p).some((id) => activityById(id).outdoor);
}

/**
 * The extra lines the plan can offer, in the printed order: siblings and parents who stay when those boxes
 * are ticked on Invitasjon, the food once it is chosen on Mat, clothes for outdoors when an outdoor game is
 * picked (or the party is outside), and «Si fra om allergier» always.
 */
export function availableInfoLines(p: Party): InfoLineId[] {
  const s = resolveInvitation(p);
  return INFO_LINE_IDS.filter((id) => {
    switch (id) {
      case 'siblings':
        return s.siblings;
      case 'parentsHelp':
        return s.parentsHelp;
      case 'menu':
        return menuLine(p) !== null;
      case 'outdoor':
        return outdoorPlanned(p);
      case 'allergies':
        return true;
    }
  });
}

/**
 * The lines that print: her picks (only the ones the plan still offers), or, until she picks, the first two
 * the plan offers. Never more than two.
 */
export function chosenInfoLines(p: Party): InfoLineId[] {
  const offered = availableInfoLines(p);
  const picked = p.invitation?.infoLines;
  const lines = picked ? offered.filter((id) => picked.includes(id)) : offered;
  return lines.slice(0, MAX_INFO_LINES);
}

/**
 * Ticks a line on or off. A third line is not added (the screen says «Fjern en hvis du vil bytte»). Returns the
 * new list to store, in the printed order.
 */
export function toggleInfoLine(p: Party, id: InfoLineId): InfoLineId[] {
  const now = chosenInfoLines(p);
  if (now.includes(id)) return now.filter((x) => x !== id);
  if (now.length >= MAX_INFO_LINES) return now;
  return INFO_LINE_IDS.filter((x) => x === id || now.includes(x));
}

/** The words of one extra line, in the active language. */
export function infoLineText(p: Party, id: InfoLineId): string {
  if (id === 'menu') return menuLine(p) ?? t('print.info.menu', { food: t('rules.menu.dish.food') });
  return t(`print.info.${id}`);
}

// ---------- the card's words ----------

/** HTML-escapes text from the party (names, address, her own words). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A translated line with some values given as ready HTML (bold names, the big age): the words are escaped,
 * the HTML values are put in afterwards. Plain values are escaped as usual.
 */
function line(key: string, plain: Record<string, string | number>, html: Record<string, string> = {}): string {
  const marks: Record<string, string> = {};
  Object.keys(html).forEach((k, i) => (marks[k] = `\u0001${i}\u0001`));
  const text = (t as unknown as (k: string, o: object) => string)(key, { ...plain, ...marks });
  let out = escapeHtml(text);
  Object.keys(html).forEach((k, i) => (out = out.split(`\u0001${i}\u0001`).join(html[k])));
  return out;
}

/** Everything one card says, as plain text (tests, the size estimate) and as HTML. */
export interface CardFace {
  /** null: a blank «Til: ________» card. */
  name: string | null;
  headline: string;
  headlineHtml: string;
  welcome: string;
  /** «Lørdag 14. november» and «kl. 15–17». */
  date: string;
  time: string;
  /** The address, «Hjemme hos oss», or null (nothing to print). */
  place: string | null;
  info: string[];
  /** The reply, first line (with the parents' names when she wrote them); '' when the second line says it all. */
  reply: string;
  replyHtml: string;
  /** «900 00 000 · innen 7. november» (or only the svarfrist without a phone number). */
  replyBy: string;
  replyByHtml: string;
}

export function cardFace(p: Party, name: string | null): CardFace {
  const s = resolveInvitation(p);
  const names = celebrantNames(p.celebrants);
  const ages = [...new Set(p.celebrants.map((c) => c.age))].sort((a, b) => a - b);
  const count = p.celebrants.length;
  const agesPlain = joinList(ages.map(String));
  const agesHtml = joinList(ages.map((a) => `<span class="bk-age">${a}</span>`));
  const theme = p.theme ? THEMES.find((x) => x.id === p.theme) : undefined;
  const fest = theme && !theme.licensed ? theme.fest : t('print.card.fest');

  // «Emmas foreldre» / «foreldrene til Emma og Jonas»
  const parents =
    count === 1
      ? t('print.card.parentsOne', { name: genitive(p.celebrants[0].name.trim()) })
      : t('print.card.parentsMany', { names });
  const ifNot = s.replyMode === 'ifNotComing';
  // «13. november» never breaks between the day and the month
  const date = formatDayMonth(s.rsvpBy).replace(' ', '\u00a0');
  const phone = s.phone ? formatPhone(s.phone) : '';
  const tel = `<span class="bk-tel">${escapeHtml(phone)}</span>`;
  // first line: who to answer («Svar til Kari og Per (Emmas foreldre)»), or the reply mode alone; none when the
  // second line says it all («Svar til 900 00 000 · innen 7. november»)
  let reply = '';
  let replyHtml = '';
  if (s.hostNames) {
    const key = ifNot ? 'print.card.replyToIfNot' : 'print.card.replyTo';
    reply = t(key, { hosts: s.hostNames, parents });
    replyHtml = line(key, { parents }, { hosts: `<b>${escapeHtml(s.hostNames)}</b>` });
  } else if (ifNot) {
    reply = t('print.card.replyIfNot');
    replyHtml = escapeHtml(reply);
  }
  const bare = !s.hostNames && !ifNot;
  let replyBy: string;
  let replyByHtml: string;
  if (phone) {
    const key = bare ? 'print.card.replyPhoneBy' : 'print.card.phoneBy';
    replyBy = t(key, { phone, date });
    replyByHtml = line(key, { date }, { phone: tel });
  } else {
    replyBy = bare ? t('print.card.replyBy', { date }) : t('print.card.by', { date });
    replyByHtml = escapeHtml(replyBy);
  }

  return {
    name,
    headline: t('print.card.headline', { count, names, ages: agesPlain }),
    // the last age and the «!» stay together on one line
    headlineHtml: line('print.card.headline', { count, names }, { ages: agesHtml }).replace(
      /(<span class="bk-age">\d+<\/span>)([^<\s]*)$/,
      '<span class="bk-nw">$1$2</span>',
    ),
    welcome: t('print.card.welcome', { fest }),
    date: capitalize(formatLong(p.date)),
    time: t('print.card.time', { time: formatRangeCompact(p.start, p.end) }),
    place: s.address || (p.home.type === 'hus' || p.home.type === 'leilighet' ? t('print.card.home') : null),
    info: chosenInfoLines(p).map((id) => infoLineText(p, id)),
    reply,
    replyHtml,
    replyBy,
    replyByHtml,
  };
}

// ---------- sizes (deterministic, the same on every device) ----------

/** The headline size in percent of the card width: long names step down (and wrap), never cut off. */
export function headlineSize(headline: string): number {
  const n = headline.trim().length;
  if (n <= 15) return 9.6;
  if (n <= 22) return 8.4;
  if (n <= 30) return 7.4;
  if (n <= 42) return 6.4;
  return 5.6;
}

/** The «Til:» name size in percent of the card width. */
export function toNameSize(name: string): number {
  const n = name.trim().length;
  if (n <= 14) return 3.6;
  if (n <= 24) return 3.1;
  return 2.7;
}

/** Card height in percent of its width (A5: 210 / 148.5). */
const CARD_HEIGHT = (210 / 148.5) * 100;

const rows = (text: string, size: number, width: number) =>
  Math.max(1, Math.ceil((text.length * size * 0.52) / Math.max(1, width)));

/**
 * One scale for all the text on a card, ≤ 1: a card with a long address, two extra lines and the parents'
 * names gets slightly smaller letters so everything stays inside the calm area of the drawing. A rough,
 * deliberately generous estimate (an average letter is about half the font size wide).
 */
export function cardScale(face: CardFace, style: CardStyle): number {
  const width = 100 - 2 * style.box.side;
  const room = (CARD_HEIGHT * (100 - style.box.top - style.box.bottom)) / 100;
  const h = headlineSize(face.headline);
  const gap = 2.1;
  let need = 0;
  need += (face.name ? rows(face.name, toNameSize(face.name), width - 14) * toNameSize(face.name) * 1.2 : 3.6) + 2.4;
  need += rows(face.headline, h, width) * h * 1.04;
  need += rows(face.welcome, 3.6, width) * 3.6 * 1.3;
  need += rows(`${face.date} · ${face.time}`, 3.15, width - 8) * 3.15 * 1.3 + 2.6;
  if (face.place) need += rows(face.place, 3.15, width - 8) * 3.15 * 1.3 + 2.6;
  need += face.info.reduce((n, x) => n + rows(x, 2.85, width) * 2.85 * 1.4, 0);
  need += 3 + rows(face.reply, 3, width * 0.9) * 3 * 1.35 + 4.2 * 1.3;
  const blocks = 5 + (face.place ? 1 : 0) + (face.info.length ? 1 : 0);
  need += blocks * gap;
  return Math.min(1, Math.max(0.6, Math.floor((room / need) * 100) / 100));
}
