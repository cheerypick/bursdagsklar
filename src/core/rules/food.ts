/**
 * Deterministic food rules (spec §6.4–6.8). Pure functions, no UI.
 * The Mat screen shows them through rules/menu.ts (amounts plus a reason line per item).
 */
import { cakePieces as cakePiecesFor } from './cake';
import type { Dish, MenuChoice, Party, PizzaDough, PizzaTopping, ShoppingItem } from '../model';
import { PIZZA_TOPPINGS } from '../model';
import { dishShare, menuDishes } from './dishes';
import * as C from './constants';
import { band, ceilSafe } from './constants';
import { oldestAge } from './celebrants';
import { headCount } from './people';
import { formatNumber, joinList, t } from '../../i18n/i18n';
import {
  about,
  adultsCount,
  bags,
  bottles,
  each,
  grams,
  kidsCount,
  kilos,
  packsWord,
  pcs,
  peopleCount,
  tins,
} from './units';

/** The legacy shoppingList() below (not shown in the app, only unit-tested) stays in Norwegian. */
const nb = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });
/** Numbers in reason lines follow the active language: «1,5» / «1.5». */
const formatNumberLocal = (x: number) => formatNumber(x);

/** «ca. 2,3 kg» for ≥ 1000 g (one decimal, rounded up), else «450 g» (en: «about 2.3 kg»). */
export function formatGrams(g: number): string {
  if (g >= 1000) return about(kilos(Math.ceil(g / 100 - 1e-9) / 10));
  return grams(g);
}

function packs(need: number, size: number) {
  return Math.ceil(need / size - 1e-9);
}

function item(x: Omit<ShoppingItem, 'display'> & { display?: string }): ShoppingItem {
  const display =
    x.display ??
    (x.packs && x.packSize ? `${x.packs * x.packSize} (${x.packs} pk à ${x.packSize})` : `${x.need} ${x.unit}`);
  return { ...x, display };
}

export interface People {
  kidsComing: number;
  adultsEating: number;
  age: number;
  /**
   * The part of the portions this dish covers: 1 (missing) = all of them; ½ each when pølser and pizza
   * are both chosen (rules/menu.ts `dishShare`). Packs are still rounded up per item.
   */
  share?: number;
}

// ---------------- sausages ----------------

/**
 * Sausages in whole real packs (constants.ts names them), and the bread for them.
 * 3 per child and 2 per grown-up, up to whole packs (Emma: 13 × 3 + 4 × 2 = 47 → 5 pk à 10 = 50).
 * Bread: lomper and pølsebrød both on → each covers about 60 % of the sausages, up to whole packs, so there is
 * some to spare (Emma: 30 lomper, 32 pølsebrød). With one of them left out, the other covers them all.
 */
export function sausages(
  kind: 'grillpolser' | 'wienerpolser',
  p: People,
  opts: { withLomper?: boolean; withPolsebrod?: boolean } = {},
) {
  const withLomper = opts.withLomper ?? true;
  const withPolsebrod = opts.withPolsebrod ?? true;
  const both = withLomper && withPolsebrod;
  const perChild = C.SAUSAGE_PER_CHILD[band(p.age)];
  const portion = p.share ?? 1;
  const raw = p.kidsComing * perChild + p.adultsEating * C.SAUSAGE_PER_ADULT;
  /** What the whole party would need if sausages were the only dish. */
  const needAll = ceilSafe(raw);
  /** Sausages the per-person rule asks for, before rounding up to packs (half of it when pizza is chosen too). */
  const need = ceilSafe(raw * portion);
  const pack = C.SAUSAGE_PACK[kind];
  const sausagePacks = packs(need, pack);
  const bought = sausagePacks * pack;
  /** Both breads on: about 60 % of the sausages each («ca. 30 av hver»). */
  const share = ceilSafe(bought * C.BREAD_SHARE_WHEN_BOTH);
  const lomperNeed = both ? share : bought;
  const lomperPacks = packs(lomperNeed, C.LOMPER_PACK);
  const buns = both ? share : bought;
  const bunPacks = packs(buns, C.POLSEBROD_PACK);
  const eaters = p.kidsComing + p.adultsEating;
  const condiments = packs(eaters, C.CONDIMENT_PER_EATERS);
  const onionBags = packs(eaters, C.CRISPY_ONION_PER_EATERS);
  return {
    raw,
    perChild,
    /** This dish's part of the portions: 1, or ½ with pizza too. */
    portion,
    needAll,
    need,
    pack,
    packs: sausagePacks,
    /** Sausages bought: whole packs. */
    bought,
    /** Each bread's share when both are on (about 60 % of the sausages). */
    share,
    lomperNeed,
    lomper: lomperPacks * C.LOMPER_PACK,
    lomperPacks,
    buns,
    bunPacks,
    /** Pølsebrød bought: whole packs. */
    bunsBought: bunPacks * C.POLSEBROD_PACK,
    withLomper,
    withPolsebrod,
    eaters,
    /** Bottles of ketchup, and of sennep. */
    condiments,
    /** 100 g bags of sprøstekt løk. */
    onionBags,
  };
}

const persons = (k: number) => peopleCount(k);

/**
 * «13 barn × 3 + 4 voksne × 2 = 47. 5 pk Gilde Grillpølser à 10 = 50, eller 1 storpakning (3 × 10) og 2 pk»
 */
export function sausageWhy(kind: 'grillpolser' | 'wienerpolser', s: ReturnType<typeof sausages>, p: People): string {
  const product = C.SAUSAGE_PRODUCT[kind];
  const fmt = (x: number) => formatNumberLocal(x);
  const kids = t('rules.food.kidsTimes', { kids: kidsCount(p.kidsComing), per: fmt(s.perChild) });
  const adults = t('rules.food.adultsTimes', { adults: adultsCount(p.adultsEating), per: fmt(C.SAUSAGE_PER_ADULT) });
  const sum = p.adultsEating > 0 ? `${kids} + ${adults}` : kids;
  // pølser and pizza both picked: «Halvparten pølser, halvparten pizza. 13 barn × 3 + 4 voksne × 2 = 47, halvparten er 24»
  const calc =
    s.portion < 1
      ? t('rules.food.shareCount', {
          lead: shareLead(s.portion),
          sum,
          all: s.needAll,
          share: shareWord(s.portion),
          need: s.need,
        })
      : `${sum} = ${s.need}`;
  const line = t('rules.food.sausagePacks', {
    calc,
    packs: s.packs,
    product: product.name,
    size: product.count,
    bought: s.bought,
  });
  const big = Math.floor(s.packs / C.GRILL_STORPAKNING_PACKS);
  if (kind !== 'grillpolser' || big < 1) return line;
  const rest = s.packs - big * C.GRILL_STORPAKNING_PACKS;
  const or = t('rules.food.orBig', { line, big: t('rules.food.bigPacks', { count: big }) });
  return rest > 0 ? or + t('rules.food.andRest', { rest }) : or;
}

/** Both breads on: «Ca. 30 av hver – noen vil ha lompe, noen brød». One left out: the other covers every sausage. */
export function lomperWhy(s: ReturnType<typeof sausages>): string {
  return s.withPolsebrod ? t('rules.food.lomperBoth', { share: s.share }) : t('rules.food.lomperOnly');
}

export function polsebrodWhy(s: ReturnType<typeof sausages>): string {
  return s.withLomper ? t('rules.food.bunsBoth', { share: s.share }) : t('rules.food.bunsOnly');
}

/** «1 av hver» (ketchup and sennep) */
export function condimentAmount(s: ReturnType<typeof sausages>): string {
  return each(s.condiments);
}

/** «Til 17 personer. Én flaske av hver holder til ca. 25» */
export function condimentWhy(s: ReturnType<typeof sausages>): string {
  return t('rules.food.condimentWhy', { people: persons(s.eaters), per: C.CONDIMENT_PER_EATERS });
}

/** «2 poser» */
export function onionAmount(s: ReturnType<typeof sausages>): string {
  return bags(s.onionBags);
}

/** «Til 17 personer. Én pose (100 g) holder til ca. 10» */
export function onionWhy(s: ReturnType<typeof sausages>): string {
  return t('rules.food.onionWhy', { people: persons(s.eaters), per: C.CRISPY_ONION_PER_EATERS });
}

/**
 * Plain words for «one of X is enough for about N people»: with one, «Én flaske holder til 17 personer»;
 * with more, «2 flasker til 17 personer. Én holder til ca. 12».
 */
export function enoughFor(
  count: number,
  eaters: number,
  per: number,
  one: string,
  many: (count: number) => string,
): string {
  if (count <= 1) return t('rules.food.enoughOne', { one, people: persons(eaters) });
  return t('rules.food.enoughMany', { many: many(count), people: persons(eaters), one, per });
}

// ---------------- pizza ----------------

/** «Halvparten pølser, halvparten pizza»: the lead of a reason line when two dishes share the portions. */
export function shareLead(share: number): string {
  return share >= 1 ? '' : share === 0.5 ? t('rules.food.shareHalf') : t('rules.food.shareOther');
}
/** «halvparten», «en tredjedel» */
export function shareWord(share: number): string {
  return share === 0.5
    ? t('rules.food.half')
    : share > 0.3 && share < 0.34
      ? t('rules.food.third')
      : `${Math.round(share * 100)} %`;
}

/**
 * Pizza pieces: 2 per child (3 for 7–10 år, the oldest birthday child decides), 3 per adult, no extra
 * percentage (Ekaterina, 21 Oct 2026). With pølser too, half of it.
 */
export function pizzaSlices(p: People) {
  const perChild = C.PIZZA_SLICES_PER_CHILD[band(p.age)];
  const perAdult = C.PIZZA_SLICES_PER_ADULT;
  const share = p.share ?? 1;
  const all = ceilSafe(p.kidsComing * perChild + p.adultsEating * perAdult);
  return { perChild, perAdult, share, all, slices: ceilSafe(all * share) };
}

/** Pieces of pizza to make (see pizzaSlices). */
export function pizzaUnits(p: People): number {
  return pizzaSlices(p).slices;
}

export function pizzaCount(
  units: number,
  style: 'hjemmelaget' | 'frossen' | 'bestilt',
  size: '30' | '40' = '30',
): number {
  const per =
    style === 'frossen'
      ? C.PIZZA_UNITS_PER.frossen
      : style === 'hjemmelaget'
        ? C.PIZZA_SLICES_PER_LANGPANNE
        : size === '40'
          ? C.PIZZA_UNITS_PER.bestilt40
          : C.PIZZA_UNITS_PER.bestilt30;
  return packs(units, per);
}

/** The toppings of a homemade pizza: missing = the default (skinke only). */
export function pizzaToppings(t: readonly PizzaTopping[] | undefined): PizzaTopping[] {
  const picked = t ?? DEFAULT_PIZZA_TOPPINGS;
  return PIZZA_TOPPINGS.filter((x) => picked.includes(x));
}
export const DEFAULT_PIZZA_TOPPINGS: readonly PizzaTopping[] = ['skinke'];

/** Packs of one topping for N langpanner (constants.ts PIZZA_TOPPING_PRODUCT; amounts are assumptions). */
export function toppingPacks(t: PizzaTopping, trays: number, eaters: number): number {
  const prod = C.PIZZA_TOPPING_PRODUCT[t];
  if ('perEaters' in prod) return Math.max(1, packs(eaters, prod.perEaters));
  return Math.max(1, ceilSafe(trays * prod.perLangpanne));
}

/**
 * Homemade pizza for N langpanner (12 biter each): the dough for the chosen base, pizzasaus and revet
 * ost (always), and one pack count per topping chip. Rounded up to whole packs.
 */
export function homemadePizza(
  trays: number,
  opts: { dough?: PizzaDough; toppings?: readonly PizzaTopping[]; eaters?: number; roundBases?: number } = {},
) {
  const dough = opts.dough ?? 'ferdigdeig';
  // ferdigstekte bunner: counted per person (roundBases), `trays` is then their langpanne-worth for the toppings
  const bases = opts.roundBases ?? trays * C.PIZZA_ROUND_BASES_PER_LANGPANNE;
  const doughPacks = dough === 'ferdigstekt' ? packs(bases, C.PIZZA_DOUGH_PRODUCT.ferdigstekt.perPack) : trays;
  const toppings = pizzaToppings(opts.toppings);
  const eaters = opts.eaters ?? 0;
  return {
    trays,
    slices: trays * C.PIZZA_SLICES_PER_LANGPANNE,
    dough,
    /** Ferdig pizzadeig or pizzamiks: one pack per langpanne. Ferdigstekte bunner: packs of 2. */
    doughPacks,
    roundBases: bases,
    flourDl: trays * C.PIZZA_SELF_FLOUR_DL,
    flourG: trays * C.PIZZA_SELF_FLOUR_G,
    flourPacks: packs(trays * C.PIZZA_SELF_FLOUR_G, 1000),
    yeastG: trays * C.PIZZA_SELF_YEAST_G,
    yeastPacks: packs(trays * C.PIZZA_SELF_YEAST_G, 50),
    sauceJars: Math.max(1, ceilSafe(trays * C.PIZZA_SAUCE.perLangpanne)),
    cheeseG: trays * C.PIZZA_CHEESE.gPerLangpanne,
    cheeseBags: packs(trays * C.PIZZA_CHEESE.gPerLangpanne, C.PIZZA_CHEESE.bagG),
    toppings: toppings.map((t) => ({ id: t, packs: toppingPacks(t, trays, eaters) })),
  };
}

/**
 * Ferdigstekte (ready-baked, round) bunner, counted per person (Ekaterina, 21 Oct 2026): 1 bunn per 4
 * children 3–6 år, 1 per 3 children 7–10 år (the oldest birthday child decides), 1 per 2 adults
 * (ASSUMPTION). Children and adults each rounded up to whole bunner, then whole packs of 2.
 * Emma (13 barn, 4 voksne, 5 år): 4 + 2 = 6 bunner → 3 pk.
 */
export function roundBases(p: People) {
  const kidsPer = C.KIDS_PER_ROUND_BASE[band(p.age)];
  const adultsPer = C.ADULTS_PER_ROUND_BASE;
  const share = p.share ?? 1;
  const kidBases = p.kidsComing > 0 ? ceilSafe(p.kidsComing / kidsPer) : 0;
  const adultBases = p.adultsEating > 0 ? ceilSafe(p.adultsEating / adultsPer) : 0;
  const all = Math.max(1, kidBases + adultBases);
  const bases = Math.max(1, ceilSafe(all * share));
  const perPack = C.PIZZA_DOUGH_PRODUCT.ferdigstekt.perPack;
  return { kidsPer, adultsPer, share, kidBases, adultBases, all, bases, perPack, packs: packs(bases, perPack) };
}

/**
 * Homemade pizza for one party: N langpanner from the pieces, then homemadePizza. Ferdigstekte bunner
 * are counted per person instead (roundBases); saus, ost and fyll then follow the bunner, 1 bunn ≈ ½
 * langpanne (ASSUMPTION, constants.ts LANGPANNE_PER_ROUND_BASE).
 */
export function homemadeFor(m: Extract<Dish, { kind: 'pizza' }>, p: People) {
  const sl = pizzaSlices(p);
  const eaters = ceilSafe((p.kidsComing + p.adultsEating) * sl.share);
  if (m.dough === 'ferdigstekt') {
    const rb = roundBases(p);
    const trays = rb.bases * C.LANGPANNE_PER_ROUND_BASE;
    return { sl, rb, h: homemadePizza(trays, { dough: m.dough, toppings: m.toppings, eaters, roundBases: rb.bases }) };
  }
  const trays = Math.max(1, pizzaCount(sl.slices, 'hjemmelaget'));
  return { sl, rb: undefined, h: homemadePizza(trays, { dough: m.dough, toppings: m.toppings, eaters }) };
}

/** Names and ids of the homemade pizza lines (Mat screen and shopping list use the same ids). */
/** `name` is read in the active language each time (a getter), so a language switch shows at once. */
const doughLine = (id: string, dough: PizzaDough) => ({
  id,
  get name() {
    return t(`rules.food.dough.${dough}`);
  },
});
export const PIZZA_DOUGH_LINE: Record<PizzaDough, { readonly id: string; readonly name: string }> = {
  ferdigdeig: doughLine('pizzadeig', 'ferdigdeig'),
  ferdigstekt: doughLine('pizzabunner', 'ferdigstekt'),
  miks: doughLine('pizzamiks', 'miks'),
  selv: doughLine('hvetemel', 'selv'),
};
/** Topping line ids: skinke keeps the old `pizzaskinke`. */
export const PIZZA_TOPPING_LINE_ID: Record<PizzaTopping, string> = {
  skinke: 'pizzaskinke',
  pepperoni: 'pepperoni',
  sopp: 'sopp',
  ananas: 'ananas',
  mais: 'mais',
  paprika: 'paprika',
  kebab: 'kebab',
  rommedressing: 'rommedressing',
};

const UNIT_WORD: Record<string, (n: number) => string> = {
  pk: packsWord,
  boks: tins,
  stk: pcs,
  flaske: bottles,
};
/** «2 bokser», «1 flaske» (en: «2 tins», «1 bottle») */
export function toppingAmount(topping: PizzaTopping, n: number): string {
  return UNIT_WORD[C.PIZZA_TOPPING_PRODUCT[topping].unit](n);
}

function pizzaShoppingLines(m: Extract<Dish, { kind: 'pizza' }>, p: People) {
  const { h } = homemadeFor(m, p);
  const out: (Omit<ShoppingItem, 'display'> & { display: string })[] = [];
  const base = { trip: 'torrvarer' as const, ruleRef: 'menu.pizza' };
  const d = PIZZA_DOUGH_LINE[h.dough];
  if (h.dough === 'selv') {
    out.push({
      ...base,
      id: 'hvetemel',
      name: 'Hvetemel',
      need: h.flourG,
      unit: 'g',
      packSize: 1000,
      packs: h.flourPacks,
      display: `${h.flourPacks} pk à 1 kg`,
    });
    out.push({
      ...base,
      id: 'gjaer',
      name: 'Fersk gjær',
      need: h.yeastG,
      unit: 'g',
      packSize: 50,
      packs: h.yeastPacks,
      display: `${h.yeastPacks} pk à 50 g`,
      trip: 'ferskvarer',
    });
  } else {
    const rounds = h.dough === 'ferdigstekt';
    const perPack = C.PIZZA_DOUGH_PRODUCT.ferdigstekt.perPack;
    out.push({
      ...base,
      id: d.id,
      name: d.name,
      need: rounds ? h.roundBases : h.doughPacks,
      unit: rounds ? 'stk' : 'pk',
      packSize: rounds ? perPack : undefined,
      packs: h.doughPacks,
      display: rounds ? `${h.doughPacks} pk à ${perPack}` : `${h.doughPacks} pk`,
      trip: h.dough === 'miks' ? 'torrvarer' : 'ferskvarer',
    });
  }
  out.push({
    ...base,
    id: 'pizzasaus',
    name: 'Pizzasaus',
    need: h.sauceJars,
    unit: 'glass',
    packs: h.sauceJars,
    display: `${h.sauceJars} glass`,
  });
  out.push({
    ...base,
    id: 'pizzaost',
    name: 'Revet ost',
    need: h.cheeseG,
    unit: 'g',
    packSize: C.PIZZA_CHEESE.bagG,
    packs: h.cheeseBags,
    display: `${h.cheeseBags} pose${h.cheeseBags === 1 ? '' : 'r'} à 400 g`,
    trip: 'ferskvarer',
  });
  for (const t of h.toppings) {
    const prod = C.PIZZA_TOPPING_PRODUCT[t.id];
    const unit = prod.unit === 'flaske' ? 'flaske' : prod.unit === 'boks' ? 'boks' : prod.unit === 'stk' ? 'stk' : 'pk';
    out.push({
      ...base,
      id: PIZZA_TOPPING_LINE_ID[t.id],
      name: prod.name,
      need: t.packs,
      unit,
      packs: t.packs,
      display: toppingAmount(t.id, t.packs),
      trip: unit === 'boks' || unit === 'flaske' ? 'torrvarer' : 'ferskvarer',
    });
  }
  return out;
}

// ---------------- taco ----------------

export function taco(p: People) {
  const b = band(p.age);
  const k = 1 + C.TACO_BUFFER;
  const meatG = ceilSafe((p.kidsComing * C.TACO_MEAT_G[b] + p.adultsEating * C.TACO_MEAT_G_ADULT) * k);
  const tortillas = ceilSafe((p.kidsComing * C.TACO_TORTILLA[b] + p.adultsEating * C.TACO_TORTILLA_ADULT) * k);
  const cheeseG = ceilSafe((p.kidsComing * C.TACO_CHEESE_G[b] + p.adultsEating * C.TACO_CHEESE_G_ADULT) * k);
  const meatPacks = packs(meatG, C.TACO_MEAT_PACK_G);
  const eaters = p.kidsComing + p.adultsEating;
  const sides = packs(eaters, C.TACO_SIDES_PER_EATERS);
  return {
    meatG,
    meatPacks,
    tortillas,
    tortillaPacks: packs(tortillas, C.TACO_TORTILLA_PACK),
    cheeseG,
    cheesePacks: packs(cheeseG, C.TACO_CHEESE_PACK_G),
    spiceBags: Math.ceil(meatPacks / 2),
    mais: sides,
    romme: sides,
    tacosaus: sides,
    isberg: sides / 2,
  };
}

// ---------------- pasta / pastasalat ----------------

export function pasta(style: 'salat' | 'varm', p: People) {
  const b = band(p.age);
  const k = 1 + C.PASTA_BUFFER;
  const eaters = p.kidsComing + p.adultsEating;
  const pastaG = ceilSafe((p.kidsComing * C.PASTA_DRY_G[b] + p.adultsEating * C.PASTA_DRY_G_ADULT) * k);
  const out = { pastaG, pastaPacks: packs(pastaG, C.PASTA_PACK_G), eaters };
  if (style === 'salat') {
    const hamG = ceilSafe((p.kidsComing * C.PASTA_HAM_G[b] + p.adultsEating * C.PASTA_HAM_G_ADULT) * k);
    return {
      ...out,
      hamG,
      hamPacks: packs(hamG, C.PASTA_HAM_PACK_G),
      veg: packs(eaters, C.PASTA_VEG_PER_EATERS),
      dressing: packs(eaters, C.PASTA_DRESSING_PER_EATERS),
      sauceJars: 0,
      cheesePacks: 0,
    };
  }
  return {
    ...out,
    hamG: 0,
    hamPacks: 0,
    veg: 0,
    dressing: 0,
    sauceJars: packs(p.kidsComing + p.adultsEating * 1.5, C.PASTA_SAUCE_PER_PORTIONS),
    cheesePacks: packs(eaters, C.PASTA_CHEESE_PER_EATERS),
  };
}

// ---------------- egen meny ----------------

export function customDish(m: Extract<MenuChoice, { kind: 'egen' }>, p: Pick<People, 'kidsComing' | 'adultsEating'>) {
  const need = ceilSafe((p.kidsComing * m.perChild + p.adultsEating * m.perAdult) * (1 + m.bufferPct / 100));
  return { need, packs: m.packSize ? packs(need, m.packSize) : undefined };
}

// ---------------- extras (§6.7) ----------------

/** `candleAges`: one candle set per birthday child (age + 1 each); defaults to `p.age`. */
/** No candy here: it belongs to the goodie bags (godteposer), picked on Handleliste. See docs/ARCHITECTURE.md. */
export function extras(p: People, opts: { muffins: boolean; candleAges?: number[] }) {
  const saftLitres = (p.kidsComing * C.SAFT_DL_CHILD + p.adultsEating * C.SAFT_DL_ADULT) / 10;
  const fruitG = p.kidsComing * C.FRUIT_G_CHILD + p.adultsEating * C.FRUIT_G_ADULT;
  // Kake (Oct 2026): 1,5 pieces per child + 1 per adult (rules/cake.ts, an assumption Ekaterina approved)
  const cakePieces = cakePiecesFor(p.kidsComing, p.adultsEating);
  const muffins = opts.muffins ? Math.ceil((p.kidsComing * C.MUFFINS_PER_CHILD) / 6 - 1e-9) * 6 : 0;
  return {
    saftLitres: Math.round(saftLitres * 10) / 10,
    saftBottles: packs(saftLitres, C.SAFT_LITRES_PER_BOTTLE),
    fruitG,
    fruitDisplay: formatGrams(fruitG),
    cakePieces,
    cakeBatches: packs(cakePieces, C.CAKE_PIECES_PER_LANGPANNE),
    muffins,
    candles: (opts.candleAges ?? [p.age]).reduce((sum, a) => sum + a + 1, 0),
    goodyBags: p.kidsComing,
  };
}

// ---------------- allergies (§6.8, the parts milestone 1 needs) ----------------

/** Kyllingpølser for children who don't eat pork: the same per-child rule, plus one to spare. */
export function extraSausagesFor(_kind: 'grillpolser' | 'wienerpolser', affectedKids: number, age: number): number {
  if (affectedKids <= 0) return 0;
  return ceilSafe(affectedKids * C.SAUSAGE_PER_CHILD[band(age)]) + 1;
}

// ---------------- the shopping list for a party ----------------

/**
 * Whether the parent left a food line in (the Mat screen's tap toggle). The Mat lines and the shopping
 * list share item ids (`polsebrod`, `saft` …), so a line deselected on Mat is left off the list too.
 */
export function isIncluded(party: Pick<Party, 'foodItems'>, id: string): boolean {
  return party.foodItems?.[id]?.included !== false;
}

export const MENU_NAMES: Record<MenuChoice['kind'], string> = {
  grillpolser: 'Grillmeny',
  wienerpolser: 'Pølsemeny',
  pizza: 'Pizza',
  taco: 'Taco',
  pasta: 'Pasta',
  annet: 'Egen hovedrett',
  egen: 'Egen meny',
  flere: 'Flere retter',
};

/** Short word for the main item on a shopping trip («Pølser, frukt og grønt»; «Pølser og pizzadeig» for two). */
export function mainItemWord(menu: MenuChoice | null): string {
  const words = mainItemWords(menu);
  if (words.length === 0) return t('rules.food.itemWord.food');
  return joinList(words);
}

/** The main item of each dish, the first capitalised and the rest lower case («Pølser», «pizzadeig og ost»). */
export function mainItemWords(menu: MenuChoice | null): string[] {
  return menuDishes(menu)
    .map(dishItemWord)
    .map((w, i) => (i === 0 ? w : w.charAt(0).toLowerCase() + w.slice(1)));
}

function dishItemWord(menu: Dish): string {
  switch (menu.kind) {
    case 'grillpolser':
    case 'wienerpolser':
      return t('rules.food.itemWord.polser');
    case 'pizza':
      return t(menu.style === 'hjemmelaget' ? 'rules.food.itemWord.pizzaHome' : 'rules.food.itemWord.pizza');
    case 'taco':
      return t('rules.food.itemWord.taco');
    case 'pasta':
      return t(menu.style === 'salat' ? 'rules.food.itemWord.pastaSalad' : 'rules.food.itemWord.pasta');
    case 'annet':
      return menu.text.trim() || t('rules.food.itemWord.food');
    case 'egen':
      return menu.name || t('rules.food.itemWord.food');
  }
}

export function shoppingList(party: Party): ShoppingItem[] {
  const hc = headCount(party);
  // joint birthday: portions follow the OLDEST birthday child's band (it feeds the most, and it's safe)
  const p: People = { kidsComing: hc.kidsComing, adultsEating: hc.adultsEating, age: oldestAge(party.celebrants) };
  const out: ShoppingItem[] = [];
  // several dishes (pølser + pizza): each covers its share of the portions, rounded up per item
  const share = dishShare(party.menu);
  for (const m of menuDishes(party.menu)) dishItems(m, { ...p, share }, party, out);

  const e = extras(p, { muffins: party.cake.muffins, candleAges: party.celebrants.map((c) => c.age) });
  out.push(
    item({
      id: 'saft',
      name: 'Saft',
      need: e.saftLitres,
      unit: 'l',
      packs: e.saftBottles,
      display: `${e.saftBottles} flasker (blir ca. ${nb.format(e.saftLitres)} liter)`,
      trip: 'torrvarer',
      ruleRef: 'extras.saft',
    }),
  );
  out.push(
    item({
      id: 'frukt',
      name: 'Frukt og grønt',
      need: e.fruitG,
      unit: 'g',
      display: e.fruitDisplay,
      trip: 'ferskvarer',
      ruleRef: 'extras.frukt',
    }),
  );
  out.push(
    item({
      id: 'godteposer',
      name: 'Godteposer',
      need: e.goodyBags,
      unit: 'stk',
      display: `${e.goodyBags}`,
      trip: 'torrvarer',
      ruleRef: 'extras.godteposer',
    }),
  );
  out.push(
    item({
      id: 'kakelys',
      name: 'Kakelys',
      why: party.celebrants.length > 1 ? 'Ett lys-sett per bursdagsbarn' : undefined,
      need: e.candles,
      unit: 'stk',
      display: `${e.candles}`,
      trip: 'torrvarer',
      ruleRef: 'extras.kakelys',
      homeItemId: 'kakelys',
    }),
  );
  out.push(
    item({
      id: 'pappkrus-og-fat',
      name: 'Tallerkener, kopper og servietter',
      need: 1,
      unit: 'pk',
      display: 'til alle',
      trip: 'torrvarer',
      ruleRef: 'extras.tableware',
      homeItemId: 'pappkrus-og-fat',
    }),
  );
  out.push(
    item({
      id: 'ballonger',
      name: 'Ballonger',
      need: 1,
      unit: 'pk',
      display: '1 pk',
      trip: 'torrvarer',
      ruleRef: 'extras.ballonger',
      homeItemId: 'ballonger',
    }),
  );
  out.push(
    item({
      id: 'bursdagskrone',
      name: 'Bursdagskrone',
      need: 1,
      unit: 'stk',
      display: '1',
      trip: 'torrvarer',
      ruleRef: 'extras.krone',
      homeItemId: 'bursdagskrone',
    }),
  );

  return out.filter((i) => (!i.homeItemId || !party.haveAtHome.includes(i.homeItemId)) && isIncluded(party, i.id));
}

/** The shopping items for one dish (pushes into `out`). `p.share` is its part of the portions. */
function dishItems(m: Dish, p: People, party: Party, out: ShoppingItem[]) {
  if (m.kind === 'grillpolser' || m.kind === 'wienerpolser') {
    const s = sausages(m.kind, p, {
      withLomper: party.foodItems?.lomper?.included !== false,
      withPolsebrod: party.foodItems?.polsebrod?.included !== false,
    });
    out.push(
      item({
        id: m.kind,
        name: m.kind === 'grillpolser' ? 'Grillpølser' : 'Wienerpølser',
        need: s.need,
        unit: 'stk',
        packSize: s.pack,
        packs: s.packs,
        trip: 'ferskvarer',
        ruleRef: 'menu.sausage',
        why: sausageWhy(m.kind, s, p),
      }),
    );
    out.push(
      item({
        id: 'lomper',
        name: 'Lomper',
        need: s.lomperNeed,
        unit: 'stk',
        packSize: C.LOMPER_PACK,
        packs: s.lomperPacks,
        trip: 'torrvarer',
        ruleRef: 'menu.sausage',
        why: lomperWhy(s),
      }),
    );
    out.push(
      item({
        id: 'polsebrod',
        name: 'Pølsebrød',
        need: s.buns,
        unit: 'stk',
        packSize: C.POLSEBROD_PACK,
        packs: s.bunPacks,
        trip: 'ferskvarer',
        ruleRef: 'menu.sausage',
        why: polsebrodWhy(s),
      }),
    );
    out.push(
      item({
        id: 'ketchup',
        name: 'Ketchup og sennep',
        need: s.condiments,
        unit: 'stk',
        display: condimentAmount(s),
        trip: 'torrvarer',
        ruleRef: 'menu.sausage',
        why: condimentWhy(s),
      }),
    );
    out.push(
      item({
        id: 'lok',
        name: 'Sprøstekt løk',
        need: s.onionBags,
        unit: 'pose',
        display: onionAmount(s),
        trip: 'torrvarer',
        ruleRef: 'menu.sausage',
        why: onionWhy(s),
      }),
    );
  } else if (m.kind === 'pizza') {
    const units = pizzaUnits(p);
    if (m.style === 'hjemmelaget') {
      for (const l of pizzaShoppingLines(m, p)) out.push(item(l));
    } else {
      const size = m.takeawaySize ?? '30';
      const n = pizzaCount(units, m.style, size);
      out.push(
        item({
          id: m.style === 'frossen' ? 'frossenpizza' : 'pizza',
          name:
            m.style === 'frossen'
              ? 'Frossenpizza'
              : size === '40'
                ? 'Pizza, stor (ca. 40 cm)'
                : 'Pizza, vanlig (ca. 30 cm)',
          need: n,
          unit: 'stk',
          display: `${n}`,
          trip: 'ferskvarer',
          ruleRef: 'menu.pizza',
        }),
      );
    }
  } else if (m.kind === 'taco') {
    const t = taco(p);
    out.push(
      item({
        id: 'kjottdeig',
        name: 'Kjøttdeig',
        need: t.meatG,
        unit: 'g',
        packSize: 400,
        packs: t.meatPacks,
        display: `${t.meatPacks} pk à 400 g`,
        trip: 'ferskvarer',
        ruleRef: 'menu.taco',
      }),
    );
    out.push(
      item({
        id: 'tortillas',
        name: 'Små tortillas',
        need: t.tortillas,
        unit: 'stk',
        packSize: 8,
        packs: t.tortillaPacks,
        trip: 'torrvarer',
        ruleRef: 'menu.taco',
      }),
    );
    out.push(
      item({
        id: 'tacoost',
        name: 'Revet ost',
        need: t.cheeseG,
        unit: 'g',
        packSize: 350,
        packs: t.cheesePacks,
        display: `${t.cheesePacks} pk à 350 g`,
        trip: 'ferskvarer',
        ruleRef: 'menu.taco',
      }),
    );
    out.push(
      item({
        id: 'tacokrydder',
        name: 'Tacokrydder, mild',
        need: t.spiceBags,
        unit: 'pose',
        display: `${t.spiceBags} poser`,
        trip: 'torrvarer',
        ruleRef: 'menu.taco',
      }),
    );
  } else if (m.kind === 'pasta') {
    const x = pasta(m.style, p);
    out.push(
      item({
        id: 'pasta',
        name: m.style === 'salat' ? 'Pasta (skruer)' : 'Pasta',
        need: x.pastaG,
        unit: 'g',
        packSize: C.PASTA_PACK_G,
        packs: x.pastaPacks,
        display: `${x.pastaPacks} pk à 500 g`,
        trip: 'torrvarer',
        ruleRef: 'menu.pasta',
      }),
    );
    if (m.style === 'salat') {
      out.push(
        item({
          id: 'pastaskinke',
          name: 'Skinke i terninger',
          need: x.hamG,
          unit: 'g',
          packSize: C.PASTA_HAM_PACK_G,
          packs: x.hamPacks,
          display: `${x.hamPacks} pk à ${C.PASTA_HAM_PACK_G} g`,
          trip: 'ferskvarer',
          ruleRef: 'menu.pasta',
        }),
      );
      out.push(
        item({
          id: 'pastagront',
          name: 'Mais, cherrytomater og agurk',
          need: x.veg,
          unit: 'stk',
          display: `${x.veg} av hver`,
          trip: 'ferskvarer',
          ruleRef: 'menu.pasta',
        }),
      );
      out.push(
        item({
          id: 'dressing',
          name: 'Dressing',
          need: x.dressing,
          unit: 'flaske',
          display: `${x.dressing} flaske${x.dressing === 1 ? '' : 'r'}`,
          trip: 'torrvarer',
          ruleRef: 'menu.pasta',
        }),
      );
    } else {
      out.push(
        item({
          id: 'pastasaus',
          name: 'Tomatsaus til pasta',
          need: x.sauceJars,
          unit: 'glass',
          display: `${x.sauceJars} glass`,
          trip: 'torrvarer',
          ruleRef: 'menu.pasta',
        }),
      );
      out.push(
        item({
          id: 'pastaost',
          name: 'Revet ost',
          need: x.cheesePacks,
          unit: 'pose',
          display: `${x.cheesePacks} pose${x.cheesePacks === 1 ? '' : 'r'}`,
          trip: 'ferskvarer',
          ruleRef: 'menu.pasta',
        }),
      );
    }
  } else if (m.kind === 'annet') {
    // «Noe annet»: the parent's own dish; only the extras below are calculated
  } else {
    const c = customDish(m, p);
    out.push(
      item({
        id: 'egen',
        name: m.name || 'Egen rett',
        need: c.need,
        unit: m.unit === 'porsjoner' ? 'stk' : m.unit,
        display: `${c.need} ${m.unit}${c.packs ? ` · ${c.packs} pk à ${m.packSize}` : ''}`,
        trip: 'ferskvarer',
        ruleRef: 'menu.egen',
      }),
    );
  }
}
