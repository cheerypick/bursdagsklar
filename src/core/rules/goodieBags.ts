/**
 * Godteposer (Oct 2026), from Ekaterina's approved design (30 Oct): an optional little screen from Planen.
 * Pure and deterministic, fixed texts through t(), no AI, no prices, no brand names.
 *
 * - Three styles: «Klassisk godteri», «Uten godteri» (stickers, crayons, bubbles, erasers, small toys) and
 *   «Litt av begge». A style only decides which suggestion CHIPS are shown; nothing is picked for her.
 * - «Vi dropper godteposer»: no bags on Handleliste and no to-do. Her picks are kept (not shown), so she can
 *   change her mind without starting over.
 * - The chips follow the age: the smallest-parts toys (sprettball, små figurer) are suggested from 4 years
 *   (ASSUMPTION: our judgement for home parties, not a sourced rule). The age is the youngest birthday
 *   child's, the same one the rest of the app uses for the guests (rules/people.ts). A chip she already
 *   picked is always shown, so nothing she chose disappears.
 * - With a theme, the stickers and tattoos take its motif in plain words («Klistremerker med dinosaurer»).
 * - Amounts: one of each per bag, one bag per child coming (the ONE children number, birthday children
 *   included: rules/people.ts `headCount`; the Gjesteliste never changes it on its own). Candy ca. 100 g per bag
 *   (constants.ts `CANDY_G_CHILD`); with «Litt av begge» half of that (ASSUMPTION: 50 g, the rest is small
 *   toys).
 * - Old parties: a party saved before this screen has only `contents`; its style is read from them (candy
 *   only → klassisk, no candy → uten, both → begge), nothing is written, and no picks are lost.
 */
import type { GoodieBagItemId, GoodieBagStyle, Party, ShoppingState } from '../model';
import { GOODIE_BAG_ITEMS, GOODIE_BAG_STYLES } from '../model';
import { liveRecord, t, tDynamic } from '../../i18n/i18n';
import { CANDY_G_CHILD } from './constants';
import { formatGrams } from './food';
import { headCount } from './people';
import { youngestAge } from './celebrants';
import { pcs, sheets } from './units';

/** Candy, a sweet snack, or a small thing that is not candy at all. */
export type GoodieKind = 'godteri' | 'snacks' | 'ting';

export interface GoodieItemMeta {
  kind: GoodieKind;
  /** Suggested from this age (small parts). Absent = fine from 3. */
  minAge?: number;
  /** Takes the theme's motif in its name when a theme is chosen. */
  themed?: boolean;
}

export const GOODIE_ITEM_META: Readonly<Record<GoodieBagItemId, GoodieItemMeta>> = {
  godteri: { kind: 'godteri' },
  sjokolade: { kind: 'godteri' },
  popcorn: { kind: 'snacks' },
  rosiner: { kind: 'snacks' },
  fruktstang: { kind: 'snacks' },
  klistremerker: { kind: 'ting', themed: true },
  tatoveringer: { kind: 'ting', themed: true },
  fargestifter: { kind: 'ting' },
  sapebobler: { kind: 'ting' },
  viskelaer: { kind: 'ting' },
  sprettball: { kind: 'ting', minAge: 4 },
  smafigurer: { kind: 'ting', minAge: 4 },
};

/** The chips each style suggests, in order. */
export const STYLE_CHIPS: Readonly<Record<GoodieBagStyle, readonly GoodieBagItemId[]>> = {
  klassisk: ['godteri', 'sjokolade', 'popcorn', 'klistremerker'],
  uten: [
    'klistremerker',
    'tatoveringer',
    'fargestifter',
    'sapebobler',
    'viskelaer',
    'sprettball',
    'smafigurer',
    'rosiner',
    'fruktstang',
  ],
  begge: [
    'godteri',
    'popcorn',
    'klistremerker',
    'tatoveringer',
    'sapebobler',
    'fargestifter',
    'viskelaer',
    'sprettball',
    'smafigurer',
  ],
};

/** Candy per bag for a style: the existing constant, half with «Litt av begge» (assumption, see above). */
export function candyPerBag(style: GoodieBagStyle | null): number {
  return style === 'begge' ? CANDY_G_CHILD / 2 : CANDY_G_CHILD;
}

/** Where she stands: nothing decided yet, a style chosen, or «Vi dropper godteposer». */
export type GoodieStatus = 'open' | 'chosen' | 'skip';

/** The style she picked, or the one her earlier picks (Handleliste, before this screen) point to. */
export function goodieStyle(p: Pick<Party, 'goodieBags'>): GoodieBagStyle | null {
  const g = p.goodieBags;
  if (g.style && GOODIE_BAG_STYLES.includes(g.style)) return g.style;
  const contents = g.contents ?? [];
  if (contents.length === 0) return null;
  const candy = contents.some((id) => GOODIE_ITEM_META[id]?.kind === 'godteri' || id === 'popcorn');
  const other = contents.some((id) => !(GOODIE_ITEM_META[id]?.kind === 'godteri' || id === 'popcorn'));
  return candy && other ? 'begge' : candy ? 'klassisk' : 'uten';
}

/** True unless she chose «Vi dropper godteposer». */
export function goodieBagsOn(p: Pick<Party, 'goodieBags'>): boolean {
  return p.goodieBags.skip !== true;
}

export function goodieStatus(p: Pick<Party, 'goodieBags'>): GoodieStatus {
  if (!goodieBagsOn(p)) return 'skip';
  return goodieStyle(p) ? 'chosen' : 'open';
}

/** The theme's motif in words («dinosaurer», «skogsdyr»), or null without a theme. */
function motif(p: Pick<Party, 'theme'>): string | null {
  return p.theme ? tDynamic(`goodie.motif.${p.theme}`) : null;
}

const LABELS = liveRecord(GOODIE_BAG_ITEMS, (id) => `rules.shop.labels.${id}`);

/** The chip label: «Klistremerker», with a theme «Klistremerker med dinosaurer». */
export function goodieLabel(id: GoodieBagItemId, p: Pick<Party, 'theme'>): string {
  const m = GOODIE_ITEM_META[id].themed ? motif(p) : null;
  return m ? tDynamic(`goodie.themed.${id}`, { motif: m }) : LABELS[id];
}

export interface GoodieChip {
  id: GoodieBagItemId;
  label: string;
  picked: boolean;
  /** «4+» shown softly on the chip. */
  minAge?: number;
}

/**
 * The chips for this party: the style's suggestions that suit the age, plus anything she already picked
 * (never hidden). Without a style: only what she picked (the screen asks for a style first).
 */
export function goodieChips(p: Pick<Party, 'goodieBags' | 'theme' | 'celebrants'>): GoodieChip[] {
  const style = goodieStyle(p);
  const picked = new Set(p.goodieBags.contents);
  const age = youngestAge(p.celebrants);
  const suggested = new Set(
    (style ? STYLE_CHIPS[style] : []).filter((id) => (GOODIE_ITEM_META[id].minAge ?? 0) <= age),
  );
  // the style's own order first, then any earlier pick from outside the style
  const order = [...(style ? STYLE_CHIPS[style] : []), ...GOODIE_BAG_ITEMS];
  const ids = [...new Set(order)].filter((id) => suggested.has(id) || picked.has(id));
  return ids.map((id) => ({
    id,
    label: goodieLabel(id, p),
    picked: picked.has(id),
    ...(GOODIE_ITEM_META[id].minAge ? { minAge: GOODIE_ITEM_META[id].minAge } : {}),
  }));
}

/** True when the age filter left something out (the screen says so softly). */
export function smallPartsHidden(p: Pick<Party, 'goodieBags' | 'celebrants'>): boolean {
  const style = goodieStyle(p);
  if (!style) return false;
  const age = youngestAge(p.celebrants);
  return STYLE_CHIPS[style].some(
    (id) => (GOODIE_ITEM_META[id].minAge ?? 0) > age && !p.goodieBags.contents.includes(id),
  );
}

/** One bag per child: the ONE children number (the Gjesteliste never changes it on its own). */
export function goodieBagCount(p: Pick<Party, 'children' | 'hostAdults' | 'celebrants' | 'invitation'>): number {
  return Math.max(0, headCount(p).kidsComing);
}

export interface GoodieShopLine {
  id: string;
  name: string;
  qty: string;
  detail?: string;
  text: string;
}

/** The bags themselves and one line per pick; nothing when she drops the goodie bags. */
export function goodieShopLines(p: Party): GoodieShopLine[] {
  if (!goodieBagsOn(p)) return [];
  const bags = goodieBagCount(p);
  const out: GoodieShopLine[] = [
    {
      id: 'godteposer',
      name: t('rules.shop.bags'),
      qty: pcs(bags),
      detail: t('rules.shop.bagsDetail'),
      text: t('rules.shop.bagsText', { count: bags }),
    },
  ];
  for (const id of GOODIE_BAG_ITEMS) if (p.goodieBags.contents.includes(id)) out.push(goodieLine(id, bags, p));
  return out;
}

function goodieLine(id: GoodieBagItemId, bags: number, p: Party): GoodieShopLine {
  const base = { id: `pose-${id}` };
  const one = t('rules.shop.oneEach');
  const count = bags;
  const name = goodieLabel(id, p);
  switch (id) {
    case 'godteri': {
      const g = candyPerBag(goodieStyle(p));
      const qty = formatGrams(bags * g);
      return {
        ...base,
        name: t('rules.shop.candy'),
        qty,
        detail: t('rules.shop.candyDetail', { g }),
        text: t('rules.shop.candyText', { qty }),
      };
    }
    case 'popcorn':
      return {
        ...base,
        name: t('rules.shop.popcorn'),
        qty: pcs(bags),
        detail: one,
        text: t('rules.shop.popcornText', { count }),
      };
    case 'rosiner':
      return {
        ...base,
        name: t('rules.shop.raisins'),
        qty: pcs(bags),
        detail: one,
        text: t('rules.shop.raisinsText', { count }),
      };
    case 'fruktstang':
      return {
        ...base,
        name: t('rules.shop.fruitBars'),
        qty: pcs(bags),
        detail: one,
        text: t('rules.shop.fruitBarsText', { count }),
      };
    case 'klistremerker':
      return {
        ...base,
        name,
        qty: sheets(bags),
        detail: t('rules.shop.stickersDetail'),
        text: t('rules.shop.sheetsOf', { count, name: name.toLowerCase() }),
      };
    case 'tatoveringer':
      return {
        ...base,
        name,
        qty: sheets(bags),
        detail: t('rules.shop.tattoosDetail'),
        text: t('rules.shop.sheetsOf', { count, name: name.toLowerCase() }),
      };
    case 'sjokolade':
      return {
        ...base,
        name: t('rules.shop.chocolate'),
        qty: pcs(bags),
        detail: one,
        text: t('rules.shop.chocolateText', { count }),
      };
    case 'fargestifter':
      return {
        ...base,
        name: t('rules.shop.crayons'),
        qty: pcs(bags),
        detail: t('rules.shop.crayonsDetail'),
        text: t('rules.shop.crayonsText', { count }),
      };
    case 'sapebobler':
      return {
        ...base,
        name: t('rules.shop.bubbles'),
        qty: pcs(bags),
        detail: one,
        text: t('rules.shop.bubblesText', { count }),
      };
    case 'viskelaer':
      return {
        ...base,
        name: t('rules.shop.eraser'),
        qty: pcs(bags),
        detail: one,
        text: t('rules.shop.eraserText', { count }),
      };
    case 'sprettball':
      return {
        ...base,
        name: t('rules.shop.bouncyBall'),
        qty: pcs(bags),
        detail: t('rules.shop.fromFour'),
        text: t('rules.shop.bouncyBallText', { count }),
      };
    case 'smafigurer':
      return {
        ...base,
        name: t('rules.shop.figures'),
        qty: pcs(bags),
        detail: t('rules.shop.fromFour'),
        text: t('rules.shop.figuresText', { count }),
      };
  }
}

/** The Planen card: «Valgfritt …», «Uten godteri · 3 ting», «Vi dropper godteposer». */
export function goodieCardLine(p: Pick<Party, 'goodieBags'>): string {
  const status = goodieStatus(p);
  if (status === 'skip') return t('goodie.cardSkip');
  const style = goodieStyle(p);
  if (!style) return t('goodie.cardOpen');
  const n = p.goodieBags.contents.length;
  const name = t(`goodie.styles.${style}.label`);
  return n > 0 ? t('goodie.cardChosen', { style: name, count: n }) : name;
}

// ---------------- changes (pure; the provider saves them) ----------------

/** Pick a style (and undo «Vi dropper»). Her picks stay: a style only changes the suggestions. */
export function withGoodieStyle(p: Party, style: GoodieBagStyle): Party {
  const { skip: _skip, ...rest } = p.goodieBags;
  return { ...p, goodieBags: { ...rest, style } };
}

/** «Vi dropper godteposer» (or take it back). The ticks of the bag lines go too, so they come back unticked. */
export function withGoodieSkip(p: Party, skip: boolean): Party {
  const { skip: _skip, ...rest } = p.goodieBags;
  const shopping: ShoppingState = skip
    ? { ...p.shopping, ticked: p.shopping.ticked.filter((x) => x !== 'godteposer' && !x.startsWith('pose-')) }
    : p.shopping;
  return { ...p, goodieBags: skip ? { ...rest, skip: true } : rest, shopping };
}
