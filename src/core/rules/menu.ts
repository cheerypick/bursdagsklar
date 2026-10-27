/**
 * The Mat screen's numbers: one main dish → amounts for N children + M adults, each with a short
 * reason line («Ca. 2 per barn og 1,5 per voksen = 32 pølser, pluss et par ekstra. 4 pk Gilde Grillpølser (10 stk) = 40»). Pure and deterministic: the amounts
 * come from rules/food.ts and rules/constants.ts, the words are fixed templates. No AI.
 */
import type { DietTag, Dish, FoodCounts, FoodItemState, MenuChoice, Party, PizzaTopping } from '../model';
import { DIET_TAGS } from '../model';
import { dishCard, dishShare, menuDishes, type MenuCardId } from './dishes';
import * as C from './constants';
import { band } from './constants';
import { oldestAge } from './celebrants';
import { headCount } from './people';
import {
  condimentAmount,
  condimentWhy,
  onionAmount,
  onionWhy,
  enoughFor,
  extras,
  formatGrams,
  homemadeFor,
  lomperWhy,
  pasta,
  PIZZA_DOUGH_LINE,
  PIZZA_TOPPING_LINE_ID,
  pizzaCount,
  pizzaSlices,
  polsebrodWhy,
  shareLead,
  shareWord,
  toppingAmount,
  sausages,
  sausageWhy,
  taco,
  type People,
} from './food';
import { formatNumber, joinList, liveRecord, t, tDynamic } from '../../i18n/i18n';
import {
  about,
  adultsCount,
  bottles,
  bags,
  each,
  jars,
  kidsCount,
  litres,
  packsOf,
  pcs,
  pieces,
  packsWord,
} from './units';

/** Numbers in the active language: «1,5» / «1.5». */
const n = (x: number) => formatNumber(x);
const pct = (x: number) => `${Math.round(x * 100)} %`;
/** Lines that come in packs: the amount, «5 pk à 10» and the structured pack for the shopping list. */
const packed = (count: number, size: number | string) => ({
  packs: packsOf(count, size),
  packCount: count,
  packSize: String(size),
});

/** The card of the (first) dish: Planen's Mat card picture. null while nothing is chosen. */
export function menuCardOf(menu: MenuChoice | null): MenuCardId | null {
  const first = menuDishes(menu)[0];
  return first ? dishCard(first) : null;
}

/** «Grillpølser», «Hjemmelaget pizza», «Pastasalat», or the parent's own words for «Noe annet». */
export function dishTitle(menu: Dish): string {
  switch (menu.kind) {
    case 'grillpolser':
      return t('rules.menu.dish.grillpolser');
    case 'wienerpolser':
      return t('rules.menu.dish.wienerpolser');
    case 'pizza':
      return t(
        menu.style === 'hjemmelaget'
          ? 'rules.menu.dish.pizzaHome'
          : menu.style === 'frossen'
            ? 'rules.menu.dish.pizzaFrozen'
            : 'rules.menu.dish.pizza',
      );
    case 'taco':
      return t('rules.menu.dish.taco');
    case 'pasta':
      return t(menu.style === 'salat' ? 'rules.menu.dish.pastaSalad' : 'rules.menu.dish.pasta');
    case 'annet':
      return menu.text.trim() || t('rules.menu.dish.annet');
    case 'egen':
      return menu.name || t('rules.menu.dish.egen');
  }
}

/** «Grillpølser og hjemmelaget pizza»: every dish, joined in plain Norwegian. */
export function menuTitle(menu: MenuChoice): string {
  const titles = menuDishes(menu).map(dishTitle);
  if (titles.length === 0) return t('rules.menu.dish.food');
  return joinList(titles.map((x, i) => (i === 0 ? x : x.charAt(0).toLowerCase() + x.slice(1))));
}

/**
 * Children and adults the food is counted for: always the party's own head-count. One source of
 * truth: the Mat screen's «Endre» edits the party (party.ts `withGuestCounts`), not a copy.
 */
export function foodCounts(p: Party): FoodCounts {
  const hc = headCount(p);
  return { kids: hc.kidsComing, adults: hc.adultsEating };
}

/** Sanity bounds for foodPlan's input. */
export const FOOD_KIDS_MIN = 1;
export const FOOD_KIDS_MAX = 45;
export const FOOD_ADULTS_MIN = 0;
export const FOOD_ADULTS_MAX = 30;

export function clampFoodCounts(c: FoodCounts): FoodCounts {
  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(x)));
  return {
    kids: clamp(c.kids, FOOD_KIDS_MIN, FOOD_KIDS_MAX),
    adults: clamp(c.adults, FOOD_ADULTS_MIN, FOOD_ADULTS_MAX),
  };
}

export interface FoodLine {
  id: string;
  name: string;
  /** The big number: «50 stk», «2 flasker», «ca. 2,3 kg». */
  amount: string;
  /** Pack rounding, when it applies: «5 pk à 10». */
  packs?: string;
  /** The same packs as data, for the shopping list («5 pk» + «à 10»): count and pack size. */
  packCount?: number;
  packSize?: string;
  /** A plain piece count («50 stk»), for the Mat card on Planen («50 grillpølser»). */
  count?: number;
  /** Why this amount, in one short line. */
  why: string;
  /** Whether the parent can tap this line to leave it out (every quantity line in main, drikke, frukt). */
  toggleable: boolean;
  /** false = deselected: shown greyed and struck through, left out of the Mat card and the shopping list. */
  included: boolean;
}

/** A raw line before the parent's choices are applied. */
export type RawLine = Omit<FoodLine, 'toggleable' | 'included'>;

/** One section per main dish (`main-polser`, `main-pizza`, `main-annet` …), then drinks, fruit, cake. */
export type MainSectionId = `main-${MenuCardId}`;
export type FoodSectionId = MainSectionId | 'drikke' | 'snacks' | 'kake' | 'hensyn';
export const isMainSection = (id: FoodSectionId): id is MainSectionId => id.startsWith('main-');

export interface FoodSection {
  id: FoodSectionId;
  /** Main-dish sections: the card it belongs to. */
  card?: MenuCardId;
  title: string;
  lines: FoodLine[];
}

export interface FoodPlanInput {
  menu: MenuChoice;
  counts: FoodCounts;
  /** Portions follow the OLDEST birthday child's band (it feeds the most). */
  age: number;
  diets: readonly DietTag[];
  /** Number of birthday children (one candle set each). */
  celebrants: number;
  /** The parent's per-line choices (party.foodItems). Missing = everything included. */
  items?: Readonly<Record<string, FoodItemState>>;
}

/** Sections whose lines get a tap toggle. «Til kaken» is a pointer, the diet lines follow their chips. */
const TOGGLE_SECTIONS: readonly FoodSectionId[] = ['drikke', 'snacks'];
/** Lines that are not something to buy: «Din egen» (her own dish) and the oven time for frozen pizza. */
const NOT_TOGGLEABLE = new Set(['egen', 'ovnstid']);

export interface FoodPlan {
  title: string;
  /** «for 13 barn og 4 voksne» */
  forWhom: string;
  sections: FoodSection[];
}

export function forWhom(c: FoodCounts): string {
  return t('rules.menu.forWhom', { kids: kidsCount(c.kids), adults: adultsCount(c.adults) });
}

/** «ca. 2 per barn og 2 per voksen» — the per-person rule in words. */
function perPerson(child: number, adult: number, unit = '', c: FoodCounts): string {
  const u = unit ? (unit.startsWith(' ') ? unit : ` ${unit}`) : '';
  const kid = t('rules.menu.perKid', { n: n(child), unit: u });
  return c.adults > 0 ? t('rules.menu.perKidAdult', { kid, n: n(adult), unit: u }) : kid;
}

function mainLines(
  menu: Dish,
  people: People,
  c: FoodCounts,
  items: Readonly<Record<string, FoodItemState>>,
): RawLine[] {
  const b = band(people.age);
  switch (menu.kind) {
    case 'grillpolser':
    case 'wienerpolser': {
      // both breads on → about half each; one left out → the other covers every sausage (food.ts)
      const withLomper = items.lomper?.included !== false;
      const withPolsebrod = items.polsebrod?.included !== false;
      const s = sausages(menu.kind, people, { withLomper, withPolsebrod });
      // a bread the parent left out shows (greyed) what it would be if she turned it back on: half each
      const l = withLomper ? s : sausages(menu.kind, people, { withPolsebrod });
      const pb = withPolsebrod ? s : sausages(menu.kind, people, { withLomper });
      const word = t(menu.kind === 'grillpolser' ? 'rules.menu.dish.grillpolser' : 'rules.menu.dish.wienerpolser');
      return [
        {
          id: menu.kind,
          name: word,
          amount: pcs(s.bought),
          count: s.bought,
          ...packed(s.packs, s.pack),
          why: sausageWhy(menu.kind, s, people),
        },
        {
          id: 'lomper',
          name: t('rules.menu.lomper'),
          amount: pcs(l.lomper),
          count: l.lomper,
          ...packed(l.lomperPacks, C.LOMPER_PACK),
          why: lomperWhy(l),
        },
        {
          id: 'polsebrod',
          name: t('rules.menu.buns'),
          amount: pcs(pb.bunsBought),
          count: pb.bunsBought,
          ...packed(pb.bunPacks, C.POLSEBROD_PACK),
          why: polsebrodWhy(pb),
        },
        {
          id: 'ketchup',
          name: t('rules.menu.condiments'),
          amount: condimentAmount(s),
          why: condimentWhy(s),
        },
        {
          id: 'lok',
          name: t('rules.menu.onion'),
          amount: onionAmount(s),
          why: onionWhy(s),
        },
      ];
    }
    case 'pizza': {
      const sl = pizzaSlices(people);
      const kidPart = t('rules.food.kidsTimes', { kids: kidsCount(c.kids), per: n(sl.perChild) });
      const adultPart =
        c.adults > 0 ? ` + ${t('rules.food.adultsTimes', { adults: adultsCount(c.adults), per: n(sl.perAdult) })}` : '';
      const calc =
        sl.share < 1
          ? t('rules.menu.pizzaShare', {
              lead: shareLead(sl.share),
              sum: `${kidPart}${adultPart}`,
              all: pieces(sl.all),
              slices: sl.slices,
            })
          : `${kidPart}${adultPart} = ${pieces(sl.slices)}`;
      if (menu.style === 'hjemmelaget') return homemadeLines(menu, people, calc);
      const pizzas = pizzaCount(sl.slices, 'frossen');
      const rounds = Math.ceil(pizzas / C.FROZEN_PIZZAS_PER_ROUND - 1e-9);
      return [
        {
          id: 'frossenpizza',
          name: t('rules.menu.dish.pizzaFrozen'),
          amount: pcs(pizzas),
          count: pizzas,
          why: t('rules.menu.frozenWhy', { calc, per: C.PIZZA_UNITS_PER.frossen }),
        },
        {
          id: 'ovnstid',
          name: t('rules.menu.baking'),
          amount: t('rules.menu.bakingAmount', { min: rounds * C.FROZEN_ROUND_MIN }),
          why: t('rules.menu.bakingWhy', {
            per: C.FROZEN_PIZZAS_PER_ROUND,
            count: rounds,
            min: C.FROZEN_ROUND_MIN,
          }),
        },
      ];
    }
    case 'taco': {
      const tc = taco(people);
      const buf = t('rules.menu.extra', { pct: pct(C.TACO_BUFFER) });
      const isberg = Math.max(1, Math.ceil(tc.isberg - 1e-9));
      return [
        {
          id: 'kjottdeig',
          name: t('rules.menu.mince'),
          amount: formatGrams(tc.meatG),
          ...packed(tc.meatPacks, `${C.TACO_MEAT_PACK_G} g`),
          why: `${perPerson(C.TACO_MEAT_G[b], C.TACO_MEAT_G_ADULT, 'g', c)} ${buf}`,
        },
        {
          id: 'tortillas',
          name: t('rules.menu.tortillas'),
          amount: pcs(tc.tortillaPacks * C.TACO_TORTILLA_PACK),
          count: tc.tortillaPacks * C.TACO_TORTILLA_PACK,
          ...packed(tc.tortillaPacks, C.TACO_TORTILLA_PACK),
          why: `${perPerson(C.TACO_TORTILLA[b], C.TACO_TORTILLA_ADULT, '', c)} ${buf} = ${tc.tortillas}`,
        },
        {
          id: 'tacoost',
          name: t('rules.menu.cheese'),
          amount: formatGrams(tc.cheeseG),
          ...packed(tc.cheesePacks, `${C.TACO_CHEESE_PACK_G} g`),
          why: `${perPerson(C.TACO_CHEESE_G[b], C.TACO_CHEESE_G_ADULT, 'g', c)} ${buf}`,
        },
        {
          id: 'tacokrydder',
          name: t('rules.menu.spice'),
          amount: bags(tc.spiceBags),
          why: t('rules.menu.spiceWhy'),
        },
        {
          id: 'tacotilbehor',
          name: t('rules.menu.tacoSides'),
          amount: each(tc.mais),
          why: enoughFor(
            tc.mais,
            people.kidsComing + people.adultsEating,
            C.TACO_SIDES_PER_EATERS,
            t('rules.menu.tacoSidesOne'),
            each,
          ),
        },
        {
          id: 'isberg',
          name: t('rules.menu.salad'),
          amount: each(isberg),
          why: enoughFor(
            isberg,
            people.kidsComing + people.adultsEating,
            C.TACO_SIDES_PER_EATERS * 2,
            t('rules.menu.saladOne'),
            each,
          ),
        },
      ];
    }
    case 'pasta': {
      const x = pasta(menu.style, people);
      const extra = t('rules.menu.extra', { pct: pct(C.PASTA_BUFFER) });
      const first: RawLine = {
        id: 'pasta',
        name: t(menu.style === 'salat' ? 'rules.menu.pastaScrews' : 'rules.menu.pasta'),
        amount: formatGrams(x.pastaPacks * C.PASTA_PACK_G),
        ...packed(x.pastaPacks, `${C.PASTA_PACK_G} g`),
        why: `${perPerson(C.PASTA_DRY_G[b], C.PASTA_DRY_G_ADULT, t('rules.menu.dryPasta'), c)} ${extra} = ${formatGrams(x.pastaG)}`,
      };
      if (menu.style === 'salat')
        return [
          first,
          {
            id: 'pastaskinke',
            name: t('rules.menu.ham'),
            amount: `${x.hamPacks * C.PASTA_HAM_PACK_G} g`,
            ...packed(x.hamPacks, `${C.PASTA_HAM_PACK_G} g`),
            why: `${perPerson(C.PASTA_HAM_G[b], C.PASTA_HAM_G_ADULT, 'g', c)} ${extra}`,
          },
          {
            id: 'pastagront',
            name: t('rules.menu.pastaVeg'),
            amount: each(x.veg),
            why: enoughFor(x.veg, x.eaters, C.PASTA_VEG_PER_EATERS, t('rules.menu.pastaVegOne'), each),
          },
          {
            id: 'dressing',
            name: t('rules.menu.dressing'),
            amount: bottles(x.dressing),
            why: enoughFor(x.dressing, x.eaters, C.PASTA_DRESSING_PER_EATERS, t('rules.menu.oneBottle'), bottles),
          },
        ];
      return [
        first,
        {
          id: 'pastasaus',
          name: t('rules.menu.pastaSauce'),
          amount: jars(x.sauceJars),
          why: t('rules.menu.pastaSauceWhy', { per: C.PASTA_SAUCE_PER_PORTIONS }),
        },
        {
          id: 'pastaost',
          name: t('rules.menu.cheese'),
          amount: bags(x.cheesePacks),
          why: enoughFor(x.cheesePacks, x.eaters, C.PASTA_CHEESE_PER_EATERS, t('rules.menu.oneBag'), bags),
        },
      ];
    }
    case 'annet':
    case 'egen':
      return [
        {
          id: 'egen',
          name: menuTitle(menu),
          amount: t('rules.menu.ownAmount'),
          why: t('rules.menu.ownWhy'),
        },
      ];
  }
}

/** «Ferdig pizzadeig» examples etc. are shop product names; only the joining word is translated. */
const examples = (x: string) => x.replace(' eller ', ` ${t('common.or')} `);

/**
 * Ferdigstekte bunner in words: «13 barn ÷ 4 + 4 voksne ÷ 2 = 6 bunner, rundet opp. 3 pk à 2». Each part
 * is rounded up to whole bunner (so 13 ÷ 4 counts as 4).
 */
export function roundBasesWhy(rb: NonNullable<ReturnType<typeof homemadeFor>['rb']>, people: People): string {
  const parts: string[] = [];
  if (people.kidsComing > 0)
    parts.push(t('rules.menu.basesPart', { who: kidsCount(people.kidsComing), per: rb.kidsPer }));
  if (people.adultsEating > 0)
    parts.push(t('rules.menu.basesPart', { who: adultsCount(people.adultsEating), per: rb.adultsPer }));
  const sum = t('rules.menu.basesSum', { parts: parts.join(' + '), bases: t('units.bases', { count: rb.all }) });
  const head =
    rb.share < 1
      ? t('rules.menu.basesShare', { lead: shareLead(rb.share), sum, share: shareWord(rb.share), n: rb.bases })
      : sum;
  return `${head}. ${packsOf(rb.packs, rb.perPack)}`;
}

/** Homemade pizza: the trays, the base she picked, sauce and cheese (always), then one line per topping chip. */
function homemadeLines(menu: Extract<Dish, { kind: 'pizza' }>, people: People, calc: string): RawLine[] {
  const { h, rb } = homemadeFor(menu, people);
  const rounds = h.dough === 'ferdigstekt' && rb !== undefined;
  // ready-baked round bases: 2 bunner are about one langpanne, so «per langpanne» reads «per 2 bunner»
  const rate = (id: PizzaTopping | 'sauce' | 'cheese', opts?: Record<string, string | number>) =>
    tDynamic(rounds ? `rules.menu.bases.${id}` : `rules.menu.tray.${id}`, opts);
  const out: RawLine[] = [
    rounds
      ? {
          id: 'langpanner',
          name: t('rules.menu.pizza'),
          amount: t('units.bases', { count: rb.bases }),
          why: roundBasesWhy(rb, people),
        }
      : {
          id: 'langpanner',
          name: t('rules.menu.pizza'),
          amount: t('units.trays', { count: h.trays }),
          why: t('rules.menu.traysWhy', { calc, per: C.PIZZA_SLICES_PER_LANGPANNE }),
        },
  ];
  const d = PIZZA_DOUGH_LINE[h.dough];
  if (h.dough === 'ferdigdeig')
    out.push({
      id: d.id,
      name: d.name,
      amount: packsWord(h.doughPacks),
      why: t('rules.menu.doughWhy', { examples: examples(C.PIZZA_DOUGH_PRODUCT.ferdigdeig.examples) }),
    });
  else if (h.dough === 'ferdigstekt')
    out.push({
      id: d.id,
      name: d.name,
      amount: packsWord(h.doughPacks),
      packs: t('rules.menu.basesPerPack', { per: C.PIZZA_DOUGH_PRODUCT.ferdigstekt.perPack }),
      why: t('rules.menu.examples', { examples: examples(C.PIZZA_DOUGH_PRODUCT.ferdigstekt.examples) }),
    });
  else if (h.dough === 'miks')
    out.push({
      id: d.id,
      name: d.name,
      amount: packsWord(h.doughPacks),
      why: t('rules.menu.mixWhy', { examples: C.PIZZA_DOUGH_PRODUCT.miks.examples }),
    });
  else
    out.push(
      {
        id: 'hvetemel',
        name: PIZZA_DOUGH_LINE.selv.name,
        amount: formatGrams(h.flourG),
        ...packed(h.flourPacks, '1 kg'),
        why: t('rules.menu.flourWhy', { dl: n(h.flourDl), per: C.PIZZA_SELF_FLOUR_DL }),
      },
      {
        id: 'gjaer',
        name: t('rules.menu.yeast'),
        amount: `${h.yeastG} g`,
        ...packed(h.yeastPacks, '50 g'),
        why: t('rules.menu.yeastWhy', { per: C.PIZZA_SELF_YEAST_G }),
      },
    );
  out.push(
    {
      id: 'pizzasaus',
      name: t('rules.menu.pizzaSauce'),
      amount: jars(h.sauceJars),
      why: rate('sauce', { product: C.PIZZA_SAUCE.name }),
    },
    {
      id: 'pizzaost',
      name: t('rules.menu.cheese'),
      amount: bags(h.cheeseBags),
      packs: t('rules.menu.perBag', { g: C.PIZZA_CHEESE.bagG }),
      why: rate('cheese', { product: C.PIZZA_CHEESE.name, g: C.PIZZA_CHEESE.gPerLangpanne }),
    },
  );
  for (const tp of h.toppings) {
    const prod = C.PIZZA_TOPPING_PRODUCT[tp.id];
    const product = tp.id === 'paprika' ? t('rules.menu.paprikaProduct') : prod.product;
    out.push({
      id: PIZZA_TOPPING_LINE_ID[tp.id],
      name: t(`food.pizza.toppings.${tp.id}`),
      amount: toppingAmount(tp.id, tp.packs),
      why: `${product}. ${rate(tp.id)}`,
    });
  }
  return out;
}

export type DietGroup =
  'polser' | 'pizza-hjemmelaget' | 'pizza-frossen' | 'taco' | 'pasta-salat' | 'pasta-varm' | 'annet';

export function dietGroup(menu: Dish): DietGroup {
  switch (menu.kind) {
    case 'grillpolser':
    case 'wienerpolser':
      return 'polser';
    case 'pizza':
      return menu.style === 'hjemmelaget' ? 'pizza-hjemmelaget' : 'pizza-frossen';
    case 'taco':
      return 'taco';
    case 'pasta':
      return menu.style === 'salat' ? 'pasta-salat' : 'pasta-varm';
    default:
      return 'annet';
  }
}

/** «Glutenfri» / «Gluten-free»: read in the active language each time. */
export const DIET_LABELS: Readonly<Record<DietTag, string>> = liveRecord(
  DIET_TAGS,
  (tag) => `rules.diet.labels.${tag}`,
);

/** [extra portion, note] per need and dish (rules.diet.text in the language files). Plain shopping advice, no health claims. */
function dietText(tag: DietTag, g: DietGroup): [string, string] {
  const opts = { product: C.PIZZA_GLUTENFRI, alt: C.PIZZA_GLUTENFRI_ALT };
  return [t(`rules.diet.text.${tag}.${g}.extra`, opts), t(`rules.diet.text.${tag}.${g}.note`, opts)];
}

/**
 * One line per ticked need and dish. With one dish the id is `diet-glutenfri`; with several, the first
 * dish keeps `diet-glutenfri` and the next get `diet-glutenfri-pizza-hjemmelaget` and so on.
 * With several dishes the name says which: «Glutenfri, pizza».
 */
export function dietLines(menu: MenuChoice, diets: readonly DietTag[]): RawLine[] {
  const groups = [...new Set(menuDishes(menu).map(dietGroup))];
  const many = groups.length > 1;
  return C_DIET_ORDER.filter((tag) => diets.includes(tag)).flatMap((tag) =>
    groups.map((g, i) => {
      const [extra, note] = dietText(tag, g);
      return {
        id: i === 0 ? `diet-${tag}` : `diet-${tag}-${g}`,
        name: many ? `${DIET_LABELS[tag]}, ${t(`rules.diet.dishWord.${g}`)}` : DIET_LABELS[tag],
        amount: extra,
        why: note,
      };
    }),
  );
}
const C_DIET_ORDER: readonly DietTag[] = ['glutenfri', 'laktosefri', 'vegetar', 'ingen-svin'];

/** Everything the Mat screen lists for one main dish. */
export function foodPlan(input: FoodPlanInput): FoodPlan {
  const c = clampFoodCounts(input.counts);
  const people: People = { kidsComing: c.kids, adultsEating: c.adults, age: input.age };
  const share = dishShare(input.menu);
  const e = extras(people, { muffins: false });
  const juiceL = Math.round(((c.kids * C.JUICE_DL_CHILD + c.adults * C.SAFT_DL_ADULT) / 10) * 10) / 10;
  const waterL = Math.max(1, Math.ceil(((c.kids + c.adults) * C.WATER_DL_PER_PERSON) / 10 - 1e-9));
  // one section per dish; pølser and pizza together each cover their share of the portions
  const mains = menuDishes(input.menu).map((d) => ({
    id: `main-${dishCard(d)}` as MainSectionId,
    card: dishCard(d),
    title: dishTitle(d),
    lines: mainLines(
      d,
      { ...people, share: d.kind === 'annet' || d.kind === 'egen' ? 1 : share },
      c,
      input.items ?? {},
    ),
  }));
  const raw: { id: FoodSectionId; card?: MenuCardId; title: string; lines: RawLine[] }[] = [
    ...mains,
    {
      id: 'drikke',
      title: t('rules.menu.drinks'),
      lines: [
        {
          id: 'saft',
          name: t('rules.menu.saft'),
          amount: t('rules.menu.saftAmount', { count: e.saftBottles }),
          why: t('rules.menu.saftWhy', {
            per: perPerson(C.SAFT_DL_CHILD, C.SAFT_DL_ADULT, 'dl', c),
            litres: n(e.saftLitres),
            jus: n(juiceL),
          }),
        },
        {
          id: 'vann',
          name: t('rules.menu.water'),
          amount: about(litres(waterL)),
          why: t('rules.menu.waterWhy', { dl: n(C.WATER_DL_PER_PERSON) }),
        },
      ],
    },
    {
      id: 'snacks',
      title: t('rules.menu.fruitTitle'),
      lines: [
        {
          id: 'frukt',
          name: t('rules.menu.fruit'),
          amount: e.fruitDisplay,
          why: t('rules.menu.fruitWhy', { per: perPerson(C.FRUIT_G_CHILD, C.FRUIT_G_ADULT, 'g', c) }),
        },
        // no candy: it belongs to the goodie bags (godteposer), picked on Handleliste (docs/ARCHITECTURE.md)
      ],
    },
    {
      id: 'kake',
      title: t('rules.menu.cakeTitle'),
      lines: [
        {
          id: 'kake',
          name: t('rules.menu.cake'),
          amount: about(pieces(e.cakePieces)),
          why: t(input.celebrants > 1 ? 'rules.menu.cakeWhyJoint' : 'rules.menu.cakeWhy'),
        },
      ],
    },
  ];
  const diet = dietLines(input.menu, input.diets);
  if (diet.length) raw.splice(mains.length, 0, { id: 'hensyn', title: t('food.dietTitle'), lines: diet });
  const items = input.items ?? {};
  const sections: FoodSection[] = raw.map((sec) => ({
    ...sec,
    lines: sec.lines.map((l) => {
      const toggleable = (isMainSection(sec.id) || TOGGLE_SECTIONS.includes(sec.id)) && !NOT_TOGGLEABLE.has(l.id);
      return { ...l, toggleable, included: !toggleable || items[l.id]?.included !== false };
    }),
  }));
  return { title: menuTitle(input.menu), forWhom: forWhom(c), sections };
}

/** The Mat screen for a party, or null while no menu is chosen. */
export function partyFoodPlan(p: Party): FoodPlan | null {
  if (menuDishes(p.menu).length === 0) return null;
  return foodPlan({
    // a party saved with a menu is never empty here: menuDishes(p.menu) has at least one dish
    menu: p.menu!,
    counts: foodCounts(p),
    age: oldestAge(p.celebrants),
    diets: p.diets,
    celebrants: p.celebrants.length,
    items: p.foodItems,
  });
}

/** The bread for sausages, named after the sausages on the Mat card («med lomper og pølsebrød»). */
const SAUSAGE_SIDES = ['lomper', 'polsebrod'];

/**
 * The Mat card on Planen: «Grillpølser» + «50 grillpølser med lomper og pølsebrød · 2 flasker saft ·
 * for 13 barn og 4 voksne». A line the parent deselected is left out (pølsebrød off → «med lomper»).
 */
export function foodCardSummary(p: Party): { title: string; line: string } | null {
  const plan = partyFoodPlan(p);
  if (!plan) return null;
  const firsts: string[] = [];
  for (const sec of plan.sections.filter((x) => isMainSection(x.id))) {
    const main = sec.lines[0];
    if (!main?.included) continue;
    let first: string | null = null;
    if (main.count !== undefined)
      first = t('rules.menu.cardCount', { count: main.count, name: main.name.toLowerCase() });
    else if (main.id === 'langpanner') first = t('rules.menu.cardTrays', { amount: main.amount });
    if (first && (main.id === 'grillpolser' || main.id === 'wienerpolser')) {
      const sides = sec.lines
        .filter((l) => SAUSAGE_SIDES.includes(l.id) && l.included)
        .map((l) => l.name.toLowerCase());
      if (sides.length) first = t('rules.menu.cardWith', { first, sides: joinList(sides) });
    }
    if (first) firsts.push(first);
  }
  const saft = plan.sections.find((s) => s.id === 'drikke')!.lines.find((l) => l.id === 'saft')!;
  return {
    title: plan.title,
    line: [firsts.join(' + ') || null, saft.included ? saft.amount : null, plan.forWhom].filter(Boolean).join(' · '),
  };
}
