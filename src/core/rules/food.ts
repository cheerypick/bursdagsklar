/**
 * Deterministic food rules (spec §6.4–6.8). Pure functions, no UI.
 * The Mat screen shows them through rules/menu.ts (amounts plus a reason line per item).
 */
import type { AllergyTag, MenuChoice, Party, ShoppingItem } from '../model';
import * as C from './constants';
import { band, ceilSafe } from './constants';
import { oldestAge } from './celebrants';
import { headCount } from './people';

const nb = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });

/** «ca. 2,3 kg» for ≥ 1000 g (one decimal, rounded up), else «450 g». */
export function formatGrams(g: number): string {
  if (g >= 1000) return `ca. ${nb.format(Math.ceil(g / 100 - 1e-9) / 10)} kg`;
  return `${nb.format(g)} g`;
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
  const raw = p.kidsComing * perChild + p.adultsEating * C.SAUSAGE_PER_ADULT;
  /** Sausages the per-person rule asks for, before rounding up to packs. */
  const need = ceilSafe(raw);
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

const persons = (k: number) => `${k} ${k === 1 ? 'person' : 'personer'}`;

/**
 * «13 barn × 3 + 4 voksne × 2 = 47. 5 pk Gilde Grillpølser à 10 = 50, eller 1 storpakning (3 × 10) og 2 pk»
 */
export function sausageWhy(kind: 'grillpolser' | 'wienerpolser', s: ReturnType<typeof sausages>, p: People): string {
  const product = C.SAUSAGE_PRODUCT[kind];
  const kids = `${p.kidsComing} barn × ${nb.format(s.perChild)}`;
  const adults = `${p.adultsEating} ${p.adultsEating === 1 ? 'voksen' : 'voksne'} × ${nb.format(C.SAUSAGE_PER_ADULT)}`;
  const sum = p.adultsEating > 0 ? `${kids} + ${adults}` : kids;
  const line = `${sum} = ${s.need}. ${s.packs} pk ${product.name} à ${product.count} = ${s.bought}`;
  const big = Math.floor(s.packs / C.GRILL_STORPAKNING_PACKS);
  if (kind !== 'grillpolser' || big < 1) return line;
  const rest = s.packs - big * C.GRILL_STORPAKNING_PACKS;
  const bigWords = big === 1 ? '1 storpakning' : `${big} storpakninger`;
  return `${line}, eller ${bigWords} (3 × 10)${rest > 0 ? ` og ${rest} pk` : ''}`;
}

/** Both breads on: «Ca. 30 av hver – noen vil ha lompe, noen brød». One left out: the other covers every sausage. */
export function lomperWhy(s: ReturnType<typeof sausages>): string {
  return s.withPolsebrod
    ? `Ca. ${s.share} av hver – noen vil ha lompe, noen brød. Tar du bort det ene, dekker det andre alle pølsene`
    : 'Uten pølsebrød: én lompe per pølse';
}

export function polsebrodWhy(s: ReturnType<typeof sausages>): string {
  return s.withLomper
    ? `Ca. ${s.share} av hver – noen vil ha lompe, noen brød`
    : 'Uten lomper: ett pølsebrød per pølse';
}

/** «1 av hver» (ketchup and sennep) */
export function condimentAmount(s: ReturnType<typeof sausages>): string {
  return `${s.condiments} av hver`;
}

/** «Til 17 personer. Én flaske av hver holder til ca. 25» */
export function condimentWhy(s: ReturnType<typeof sausages>): string {
  return `Til ${persons(s.eaters)}. Én flaske av hver holder til ca. ${C.CONDIMENT_PER_EATERS}`;
}

/** «2 poser» */
export function onionAmount(s: ReturnType<typeof sausages>): string {
  return `${s.onionBags} ${s.onionBags === 1 ? 'pose' : 'poser'}`;
}

/** «Til 17 personer. Én pose (100 g) holder til ca. 10» */
export function onionWhy(s: ReturnType<typeof sausages>): string {
  return `Til ${persons(s.eaters)}. Én pose (100 g) holder til ca. ${C.CRISPY_ONION_PER_EATERS}`;
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
  if (count <= 1) return `${one} holder til ${persons(eaters)}`;
  return `${many(count)} til ${persons(eaters)}. ${one} holder til ca. ${per}`;
}

// ---------------- pizza ----------------

export function pizzaUnits(p: People): number {
  const base = C.PIZZA_SLICES_PER_CHILD[band(p.age)];
  return ceilSafe((p.kidsComing * base + p.adultsEating * C.PIZZA_SLICES_PER_ADULT) * (1 + C.PIZZA_BUFFER));
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
        ? C.PIZZA_UNITS_PER.langpanne
        : size === '40'
          ? C.PIZZA_UNITS_PER.bestilt40
          : C.PIZZA_UNITS_PER.bestilt30;
  return packs(units, per);
}

/** Homemade: per-langpanne dough and topping, scaled (spec §6.5). */
export function homemadePizza(trays: number) {
  const hamTrays = trays - Math.floor(trays / 4); // one tray in four is cheese-only
  return {
    trays,
    squares: trays * 24,
    flourDl: trays * 8,
    flourG: trays * 480,
    flourPacks: packs(trays * 480, 1000),
    yeastG: trays * 25,
    yeastPacks: packs(trays * 25, 50),
    waterDl: trays * 3,
    oilSs: trays * 2,
    saltTs: trays,
    sauceDl: trays * 2.5,
    sauceJars: packs(trays * 2.5, 2.5),
    cheeseG: trays * 300,
    cheesePacks: packs(trays * 300, 350),
    hamTrays,
    hamG: hamTrays * 150,
    hamPacks: packs(hamTrays * 150, 150),
  };
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
  const cakePieces = ceilSafe((p.kidsComing + p.adultsEating) * C.CAKE_PIECES_FACTOR);
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

export function allergyUnion(party: Pick<Party, 'guests'>): AllergyTag[] {
  const set = new Set<AllergyTag>();
  party.guests.filter((g) => g.status !== 'no').forEach((g) => g.allergies.forEach((a) => set.add(a)));
  return [...set];
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
};

/** Short word for the main item on a shopping trip («Pølser, frukt og grønt»). */
export function mainItemWord(menu: MenuChoice | null): string {
  if (!menu) return 'Maten';
  switch (menu.kind) {
    case 'grillpolser':
    case 'wienerpolser':
      return 'Pølser';
    case 'pizza':
      return menu.style === 'hjemmelaget' ? 'Ost og skinke' : 'Pizza';
    case 'taco':
      return 'Kjøttdeig og tortillas';
    case 'pasta':
      return menu.style === 'salat' ? 'Pasta, skinke og grønnsaker' : 'Pasta og saus';
    case 'annet':
      return menu.text.trim() || 'Maten';
    case 'egen':
      return menu.name || 'Maten';
  }
}

export function shoppingList(party: Party): ShoppingItem[] {
  const hc = headCount(party);
  // joint birthday: portions follow the OLDEST birthday child's band (it feeds the most, and it's safe)
  const p: People = { kidsComing: hc.kidsComing, adultsEating: hc.adultsEating, age: oldestAge(party.celebrants) };
  const out: ShoppingItem[] = [];
  const m = party.menu;

  if (!m) {
    // no menu chosen yet: only the extras below
  } else if (m.kind === 'grillpolser' || m.kind === 'wienerpolser') {
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
    const noPork = party.guests.filter((g) => g.status !== 'no' && g.allergies.includes('ikke-svin')).length;
    const extra = extraSausagesFor(m.kind, noPork, p.age);
    if (extra > 0)
      out.push(
        item({
          id: 'kyllingpolser',
          name: 'Kyllingpølser',
          need: extra,
          unit: 'stk',
          display: `${extra}`,
          trip: 'ferskvarer',
          ruleRef: 'allergy.ikke-svin',
          why: 'Grilles først, på egen side',
        }),
      );
  } else if (m.kind === 'pizza') {
    const units = pizzaUnits(p);
    if (m.style === 'hjemmelaget') {
      const h = homemadePizza(pizzaCount(units, 'hjemmelaget'));
      out.push(
        item({
          id: 'hvetemel',
          name: 'Hvetemel',
          need: h.flourG,
          unit: 'g',
          packSize: 1000,
          packs: h.flourPacks,
          display: `${h.flourPacks} pk à 1 kg`,
          trip: 'torrvarer',
          ruleRef: 'menu.pizza',
        }),
      );
      out.push(
        item({
          id: 'gjaer',
          name: 'Fersk gjær',
          need: h.yeastG,
          unit: 'g',
          packSize: 50,
          packs: h.yeastPacks,
          display: `${h.yeastPacks} pk à 50 g`,
          trip: 'ferskvarer',
          ruleRef: 'menu.pizza',
        }),
      );
      out.push(
        item({
          id: 'pizzasaus',
          name: 'Pizzasaus',
          need: h.sauceDl,
          unit: 'dl',
          packs: h.sauceJars,
          display: `${h.sauceJars} glass`,
          trip: 'torrvarer',
          ruleRef: 'menu.pizza',
        }),
      );
      out.push(
        item({
          id: 'pizzaost',
          name: 'Revet ost',
          need: h.cheeseG,
          unit: 'g',
          packSize: 350,
          packs: h.cheesePacks,
          display: `${h.cheesePacks} pk à 350 g`,
          trip: 'ferskvarer',
          ruleRef: 'menu.pizza',
        }),
      );
      out.push(
        item({
          id: 'pizzaskinke',
          name: 'Skinke i strimler',
          need: h.hamG,
          unit: 'g',
          packSize: 150,
          packs: h.hamPacks,
          display: `${h.hamPacks} pk à 150 g`,
          trip: 'ferskvarer',
          ruleRef: 'menu.pizza',
        }),
      );
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
