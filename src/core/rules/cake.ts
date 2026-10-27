/**
 * Kake (Oct 2026): the cake, from Ekaterina's approved design (research: files «bursdagsklar-kake-research.pdf»,
 * Orkla's product pages, checked 26–27 Oct 2026). Pure and deterministic, fixed texts through t(), no AI.
 *
 * - Default: TORO Sjokoladekake Langpanne (880 g, one 30×40 langpanne, ca. 24 pieces; add 3,5 dl water and
 *   250 g butter, the eggs are in the mix) with TORO Kremet Sjokoladeglasur (340 g, ready to use, one tub per
 *   langpanne). The mix and both chocolate glazes are gluten-free according to Orkla; the app says so softly
 *   («Glutenfri ifølge Orkla – sjekk pakken»), since a recipe or a label can change.
 * - Alternatives: «Bake fra bunnen» (TINE «Sjokoladekake i langpanne», 30×40), TORO muffins (12 per pack) or a
 *   ready-made cake («Kjøpe ferdig»: no product list, only a soft note and the to-do «Bestill kaken»).
 * - No prices anywhere: they move.
 *
 * ASSUMPTION (Ekaterina approved it Oct 27; research §5 «my recommendation», not a sourced fact): pieces needed
 * = 1,5 per child (the ONE children number, birthday children included) + 1 per adult who stays (the same adult
 * count the food uses, incl. the helping parents from the invitation), rounded up. A langpanne is cut 6×4 = 24
 * pieces. One muffin counts as one piece (also an assumption).
 */
import type { CakeChoice, CakeGlaze, CakeKind, MuffinFlavour, Party } from '../model';
import { headCount } from './people';
import { formatNumber, t } from '../../i18n/i18n';
import { grams, packsWord, pcs } from './units';

export const CAKE_PIECES_PER_CHILD = 1.5; // (assumption, see above)
export const CAKE_PIECES_PER_ADULT = 1; // (assumption, see above)
/** One TORO Sjokoladekake Langpanne pack fills one 30×40 langpanne: ca. 24 pieces (Oda/Orkla product text). */
export const TORO_PIECES_PER_PACK = 24;
/** TORO Lyse Muffins / Sjokolademuffins: 12 medium muffins per pack (Orkla). */
export const MUFFINS_PER_PACK = 12;
/** The TINE recipe fills one 30×40 langpanne; 6×4 = 24 pieces is our assumption (TINE states no yield). */
export const SCRATCH_PIECES_PER_LANGPANNE = 24;
/** The source of the from-scratch recipe (shown as a link under the recipe). */
export const TINE_RECIPE_URL = 'https://www.tine.no/oppskrifter/kaker/krem-og-sjokoladekaker/Sjokoladekake-i-langpanne';

/** The stored `cakeId` per kind (only `kind` is read; the id keeps the record readable). */
export const CAKE_IDS: Readonly<Record<CakeKind, string>> = {
  toro: 'toro-sjokoladekake-langpanne',
  scratch: 'tine-sjokoladekake-langpanne',
  muffins: 'toro-muffins',
  buy: 'kjopt-kake',
};

export const CAKE_KINDS: readonly CakeKind[] = ['toro', 'scratch', 'muffins', 'buy'];

/** «1,5 per barn + 1 per voksen», rounded up: 10 children + 2 adults → 17 pieces. */
export function cakePieces(kids: number, adults: number): number {
  const raw = Math.max(0, kids) * CAKE_PIECES_PER_CHILD + Math.max(0, adults) * CAKE_PIECES_PER_ADULT;
  return Math.max(1, Math.ceil(raw - 1e-9));
}

/** Packs of the Toro langpanne mix for a number of pieces: ceil(pieces / 24), at least one. */
export function toroPacks(pieces: number): number {
  return Math.max(1, Math.ceil(pieces / TORO_PIECES_PER_PACK - 1e-9));
}

export interface ResolvedCake {
  kind: CakeKind;
  glaze: CakeGlaze;
  muffinFlavour: MuffinFlavour;
  /** A pack of muffins beside the Toro langpanne. */
  muffins: boolean;
  chosen: boolean;
}

/**
 * The cake with every default filled in. A party saved before the Kake screen has only
 * { mode, cakeId: 'vaniljekake-langpanne' | 'sjokoladekake-langpanne', muffins }: that cakeId was picked from
 * the youngest age and never by the parent, so it opens as the new default (the Toro chocolate langpanne);
 * mode 'buy' opens as «Kjøpe ferdig»; `muffins` keeps meaning «muffins as well».
 */
export function resolveCake(c: CakeChoice): ResolvedCake {
  const kind: CakeKind = c.kind && CAKE_KINDS.includes(c.kind) ? c.kind : c.mode === 'buy' ? 'buy' : 'toro';
  return {
    kind,
    glaze: c.glaze === 'langpanne' ? 'langpanne' : 'kremet',
    muffinFlavour: c.muffinFlavour === 'sjokolade' ? 'sjokolade' : 'lyse',
    muffins: kind === 'toro' && c.muffins === true,
    chosen: c.chosen === true,
  };
}

export interface CakePlan extends ResolvedCake {
  kids: number;
  adults: number;
  /** Pieces needed (1,5 per child + 1 per adult, rounded up). */
  pieces: number;
  /** Langpanner to bake: Toro packs (one per langpanne) or batches of the TINE recipe. 0 for muffins / buy. */
  langpanner: number;
  /** Toro muffin packs (12 each): the Muffins choice, or the pack beside the Toro langpanne. */
  muffinPacks: number;
  /** Toro glaze packs: one per Toro langpanne (the TINE recipe has its own glaze). */
  glazePacks: number;
  /** More than one Toro pack is needed: offer «1 langpanne + muffins» as a soft alternative. */
  severalPacks: boolean;
}

/** How much cake, from the party's head-count (the same children and adults as the food). */
export function cakePlan(
  p: Pick<Party, 'cake' | 'children' | 'hostAdults' | 'guests' | 'celebrants' | 'invitation'>,
): CakePlan {
  const r = resolveCake(p.cake);
  const hc = headCount(p);
  const pieces = cakePieces(hc.kidsComing, hc.adultsEating);
  const needed = toroPacks(pieces);
  let langpanner = 0;
  let muffinPacks = 0;
  if (r.kind === 'toro') {
    if (r.muffins) {
      // one langpanne fewer, and the muffins cover the rest (at least one pack)
      langpanner = Math.max(1, needed - 1);
      const rest = Math.max(0, pieces - langpanner * TORO_PIECES_PER_PACK);
      muffinPacks = Math.max(1, Math.ceil(rest / MUFFINS_PER_PACK - 1e-9));
    } else langpanner = needed;
  } else if (r.kind === 'scratch') {
    langpanner = Math.max(1, Math.ceil(pieces / SCRATCH_PIECES_PER_LANGPANNE - 1e-9));
  } else if (r.kind === 'muffins') {
    muffinPacks = Math.max(1, Math.ceil(pieces / MUFFINS_PER_PACK - 1e-9));
  }
  return {
    ...r,
    kids: hc.kidsComing,
    adults: hc.adultsEating,
    pieces,
    langpanner,
    muffinPacks,
    glazePacks: r.kind === 'toro' ? langpanner : 0,
    severalPacks: r.kind === 'toro' && needed > 1,
  };
}

/** The short name of the chosen cake («Toro sjokoladekake med glasur»), for Planen and Festen er klar. */
export function cakeChoiceLine(
  p: Pick<Party, 'cake' | 'children' | 'hostAdults' | 'guests' | 'celebrants' | 'invitation'>,
): string {
  const plan = cakePlan(p);
  if (plan.kind === 'toro') return t(plan.muffinPacks > 0 ? 'rules.cake.line.toroMuffins' : 'rules.cake.line.toro');
  return t(`rules.cake.line.${plan.kind}`);
}

/** Product names, as on the shelf (the same in every language). */
export function toroGlazeName(g: CakeGlaze): string {
  return t(g === 'kremet' ? 'rules.cake.product.glazeKremet' : 'rules.cake.product.glazeLangpanne');
}
export function toroMuffinsName(f: MuffinFlavour): string {
  return t(f === 'lyse' ? 'rules.cake.product.muffinsLyse' : 'rules.cake.product.muffinsSjokolade');
}

// ---------------- the TINE recipe, scaled ----------------

type Unit = 'g' | 'dl' | 'ss' | 'stk';
type IngredientId =
  | 'smor'
  | 'egg'
  | 'sukker'
  | 'olje'
  | 'melk'
  | 'hvetemel'
  | 'kakao'
  | 'bakepulver'
  | 'kaffe'
  | 'vaniljesukker'
  | 'melis'
  | 'kokos';
interface RawIngredient {
  id: IngredientId;
  amount: number;
  unit: Unit;
}
/** Per langpanne (30×40), from tine.no «Sjokoladekake i langpanne». */
const SCRATCH_CAKE: readonly RawIngredient[] = [
  { id: 'smor', amount: 225, unit: 'g' },
  { id: 'egg', amount: 5, unit: 'stk' },
  { id: 'sukker', amount: 4, unit: 'dl' },
  { id: 'olje', amount: 0.75, unit: 'dl' },
  { id: 'melk', amount: 0.75, unit: 'dl' },
  { id: 'hvetemel', amount: 4.5, unit: 'dl' },
  { id: 'kakao', amount: 1.5, unit: 'dl' },
  { id: 'bakepulver', amount: 1, unit: 'ss' },
];
const SCRATCH_GLAZE: readonly RawIngredient[] = [
  { id: 'smor', amount: 100, unit: 'g' },
  { id: 'kaffe', amount: 1, unit: 'dl' },
  { id: 'kakao', amount: 0.75, unit: 'dl' },
  { id: 'vaniljesukker', amount: 1.5, unit: 'ss' },
  { id: 'melis', amount: 6, unit: 'dl' },
  { id: 'kokos', amount: 2, unit: 'dl' },
];

function amountText(amount: number, unit: Unit): string {
  if (unit === 'g') return grams(amount);
  if (unit === 'stk') return pcs(amount);
  return t(unit === 'dl' ? 'units.dl' : 'units.tbsp', { value: formatNumber(amount, 2) });
}

export interface RecipeLine {
  id: string;
  name: string;
  amount: string;
}
export interface ScratchRecipe {
  langpanner: number;
  cake: RecipeLine[];
  glaze: RecipeLine[];
  steps: string[];
  glazeSteps: string[];
  url: string;
}

const scaled = (list: readonly RawIngredient[], n: number): RecipeLine[] =>
  list.map((i) => ({ id: i.id, name: t(`rules.cake.ingredients.${i.id}`), amount: amountText(i.amount * n, i.unit) }));

/** The TINE recipe for `langpanner` langpanner (the amounts multiplied; one 30×40 langpanne each). */
export function scratchRecipe(langpanner: number): ScratchRecipe {
  const n = Math.max(1, langpanner);
  return {
    langpanner: n,
    cake: scaled(SCRATCH_CAKE, n),
    glaze: scaled(SCRATCH_GLAZE, n),
    steps: (['step1', 'step2', 'step3', 'step4'] as const).map((k) => t(`rules.cake.scratch.${k}`)),
    glazeSteps: (['glazeStep1', 'glazeStep2'] as const).map((k) => t(`rules.cake.scratch.${k}`)),
    url: TINE_RECIPE_URL,
  };
}

// ---------------- what goes on Handleliste ----------------

export interface CakeShopLine {
  /** Stable ids, all starting with «kake-» so they never collide with the food lines. */
  id: string;
  name: string;
  qty: string;
  detail?: string;
  text: string;
}

/** `plain`: an ordinary ingredient, written in lower case in the shared text («350 g smør»); product names keep theirs. */
const line = (id: string, name: string, qty: string, detail?: string, plain = false): CakeShopLine => ({
  id,
  name,
  qty,
  detail,
  text: t('rules.cake.shop.text', { qty, name: plain ? name.charAt(0).toLowerCase() + name.slice(1) : name }),
});

/**
 * The cake's lines for Handleliste, from the choice on the Kake screen: the Toro packs and glaze with the
 * butter they need, the muffin packs, or the TINE ingredients (cake and glaze together, each ingredient
 * once). Nothing for a ready-made cake. The candles stay where they are (Fest og pynt).
 */
export function cakeShopLines(
  p: Pick<Party, 'cake' | 'children' | 'hostAdults' | 'guests' | 'celebrants' | 'invitation'>,
): CakeShopLine[] {
  const plan = cakePlan(p);
  const out: CakeShopLine[] = [];
  const gf = t('rules.cake.gluten');
  const butter: { g: number; parts: string[] } = { g: 0, parts: [] };
  if (plan.kind === 'toro') {
    out.push(
      line(
        'kake-toro',
        t('rules.cake.product.toro'),
        packsWord(plan.langpanner),
        `${t('rules.cake.shop.toroDetail', { count: plan.langpanner })} ${gf}`,
      ),
    );
    out.push(
      line(
        'kake-glasur',
        toroGlazeName(plan.glaze),
        packsWord(plan.glazePacks),
        t(plan.glaze === 'kremet' ? 'rules.cake.shop.glazeKremetDetail' : 'rules.cake.shop.glazeLangpanneDetail'),
      ),
    );
    butter.g += 250 * plan.langpanner;
    butter.parts.push(
      t('rules.cake.shop.butterToro', { g: 250 * plan.langpanner, dl: formatNumber(2.5 * plan.langpanner) }),
    );
    if (plan.glaze === 'langpanne')
      out.push(
        line(
          'kake-margarin',
          t('rules.cake.ingredients.margarin'),
          t('units.dl', { value: formatNumber(plan.glazePacks) }),
          t('rules.cake.shop.margarinDetail'),
          true,
        ),
      );
  }
  if (plan.muffinPacks > 0) {
    out.push(
      line(
        'kake-muffins',
        toroMuffinsName(plan.muffinFlavour),
        packsWord(plan.muffinPacks),
        `${t('rules.cake.shop.muffinsDetail', { count: plan.muffinPacks * MUFFINS_PER_PACK })} ${gf}`,
      ),
    );
    butter.g += 100 * plan.muffinPacks;
    butter.parts.push(
      t('rules.cake.shop.butterMuffins', { g: 100 * plan.muffinPacks, dl: formatNumber(plan.muffinPacks) }),
    );
  }
  if (plan.kind === 'scratch') {
    const n = plan.langpanner;
    // cake and glaze together: butter and cocoa are in both, so they are added up here
    const totals = new Map<IngredientId, RawIngredient>();
    for (const i of [...SCRATCH_CAKE, ...SCRATCH_GLAZE]) {
      const prev = totals.get(i.id);
      totals.set(i.id, { ...i, amount: (prev?.amount ?? 0) + i.amount * n });
    }
    for (const [id, i] of totals) {
      if (id === 'smor') {
        butter.g += i.amount;
        butter.parts.push(t('rules.cake.shop.butterScratch', { cake: 225 * n, glaze: 100 * n }));
        continue;
      }
      const name = t(`rules.cake.ingredients.${id}`);
      const detail = id === 'kaffe' ? t('rules.cake.shop.coffeeDetail') : undefined;
      out.push(line(`kake-${id}`, name, amountText(i.amount, i.unit), detail, true));
    }
  }
  if (butter.g > 0)
    out.push(line('kake-smor', t('rules.cake.ingredients.smor'), grams(butter.g), butter.parts.join(' · '), true));
  return out;
}

// ---------------- changes (pure; the provider saves them) ----------------

/** Applies a change from the Kake screen; `mode` and `cakeId` follow the kind. */
export function withCake(
  p: Party,
  patch: Partial<Pick<CakeChoice, 'kind' | 'glaze' | 'muffinFlavour' | 'muffins' | 'chosen'>>,
): Party {
  const next: CakeChoice = { ...p.cake, ...patch };
  const kind = resolveCake(next).kind;
  next.kind = kind;
  next.mode = kind === 'buy' ? 'buy' : 'bake';
  next.cakeId = CAKE_IDS[kind];
  return { ...p, cake: next };
}

/** Defensive read of a stored cake (older or hand-edited data): wrong types fall back to the defaults. */
export function sanitizeCake(raw: unknown): CakeChoice {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: CakeChoice = {
    mode: r.mode === 'buy' ? 'buy' : 'bake',
    cakeId: typeof r.cakeId === 'string' ? r.cakeId : CAKE_IDS.toro,
    muffins: r.muffins === true,
  };
  if (typeof r.kind === 'string' && (CAKE_KINDS as readonly string[]).includes(r.kind)) out.kind = r.kind as CakeKind;
  if (r.glaze === 'kremet' || r.glaze === 'langpanne') out.glaze = r.glaze;
  if (r.muffinFlavour === 'lyse' || r.muffinFlavour === 'sjokolade') out.muffinFlavour = r.muffinFlavour;
  if (typeof r.chosen === 'boolean') out.chosen = r.chosen;
  return out;
}
