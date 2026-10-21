/**
 * The Mat screen's numbers: one main dish → amounts for N children + M adults, each with a short
 * reason line («Ca. 2 per barn og 1,5 per voksen = 32 pølser, pluss et par ekstra. 4 pk Gilde Grillpølser (10 stk) = 40»). Pure and deterministic: the amounts
 * come from rules/food.ts and rules/constants.ts, the words are fixed templates. No AI.
 */
import type { DietTag, FoodCounts, FoodItemState, MenuChoice, Party } from '../model';
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
  homemadePizza,
  lomperWhy,
  pasta,
  pizzaCount,
  pizzaUnits,
  polsebrodWhy,
  sausages,
  sausageWhy,
  taco,
  type People,
} from './food';

const nb = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });
const n = (x: number) => nb.format(x);
const pct = (x: number) => `${Math.round(x * 100)} %`;
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** The cards in step 1, in order. «pizza» and «polser» need one more tap (how) before amounts show. */
export type MenuCardId = 'polser' | 'pizza' | 'taco' | 'pasta' | 'annet';
export const MENU_CARDS: readonly MenuCardId[] = ['polser', 'pizza', 'taco', 'pasta', 'annet'];

export function menuCardOf(menu: MenuChoice | null): MenuCardId | null {
  if (!menu) return null;
  switch (menu.kind) {
    case 'grillpolser':
    case 'wienerpolser':
      return 'polser';
    case 'pizza':
      return 'pizza';
    case 'taco':
      return 'taco';
    case 'pasta':
      return 'pasta';
    case 'annet':
    case 'egen':
      return 'annet';
  }
}

/** «Grillpølser», «Hjemmelaget pizza», «Pastasalat», or the parent's own words for «Noe annet». */
export function menuTitle(menu: MenuChoice): string {
  switch (menu.kind) {
    case 'grillpolser':
      return 'Grillpølser';
    case 'wienerpolser':
      return 'Wienerpølser';
    case 'pizza':
      return menu.style === 'hjemmelaget' ? 'Hjemmelaget pizza' : menu.style === 'frossen' ? 'Frossenpizza' : 'Pizza';
    case 'taco':
      return 'Taco';
    case 'pasta':
      return menu.style === 'salat' ? 'Pastasalat' : 'Pasta med tomatsaus';
    case 'annet':
      return menu.text.trim() || 'Egen hovedrett';
    case 'egen':
      return menu.name || 'Egen meny';
  }
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
  /** Why this amount, in one short line. */
  why: string;
  /** Whether the parent can tap this line to leave it out (every quantity line in main, drikke, frukt). */
  toggleable: boolean;
  /** false = deselected: shown greyed and struck through, left out of the Mat card and the shopping list. */
  included: boolean;
}

/** A raw line before the parent's choices are applied. */
export type RawLine = Omit<FoodLine, 'toggleable' | 'included'>;

export type FoodSectionId = 'main' | 'drikke' | 'snacks' | 'kake' | 'hensyn';

export interface FoodSection {
  id: FoodSectionId;
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
const TOGGLE_SECTIONS: readonly FoodSectionId[] = ['main', 'drikke', 'snacks'];
/** Lines that are not something to buy: «Din egen» (her own dish) and the oven time for frozen pizza. */
const NOT_TOGGLEABLE = new Set(['egen', 'ovnstid']);

export interface FoodPlan {
  title: string;
  /** «for 13 barn og 4 voksne» */
  forWhom: string;
  sections: FoodSection[];
}

export function forWhom(c: FoodCounts): string {
  return `for ${plural(c.kids, 'barn', 'barn')} og ${plural(c.adults, 'voksen', 'voksne')}`;
}

/** «ca. 2 per barn og 2 per voksen» — the per-person rule in words. */
function perPerson(child: number, adult: number, unit = '', c: FoodCounts): string {
  const u = unit ? ` ${unit}` : '';
  const kid = `ca. ${n(child)}${u} per barn`;
  return c.adults > 0 ? `${kid} og ${n(adult)}${u} per voksen` : kid;
}

function mainLines(
  menu: MenuChoice,
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
      const word = menu.kind === 'grillpolser' ? 'Grillpølser' : 'Wienerpølser';
      return [
        {
          id: menu.kind,
          name: word,
          amount: `${s.bought} stk`,
          packs: `${s.packs} pk à ${s.pack}`,
          why: sausageWhy(menu.kind, s, people),
        },
        {
          id: 'lomper',
          name: 'Lomper',
          amount: `${l.lomper} stk`,
          packs: `${l.lomperPacks} pk à ${C.LOMPER_PACK}`,
          why: lomperWhy(l),
        },
        {
          id: 'polsebrod',
          name: 'Pølsebrød',
          amount: `${pb.bunsBought} stk`,
          packs: `${pb.bunPacks} pk à ${C.POLSEBROD_PACK}`,
          why: polsebrodWhy(pb),
        },
        {
          id: 'ketchup',
          name: 'Ketchup og sennep',
          amount: condimentAmount(s),
          why: condimentWhy(s),
        },
        {
          id: 'lok',
          name: 'Sprøstekt løk',
          amount: onionAmount(s),
          why: onionWhy(s),
        },
      ];
    }
    case 'pizza': {
      const units = pizzaUnits(people);
      const unitWhy = `${perPerson(C.PIZZA_SLICES_PER_CHILD[b], C.PIZZA_SLICES_PER_ADULT, 'stykker', c)} + ${pct(C.PIZZA_BUFFER)} ekstra = ${units} stykker`;
      if (menu.style === 'hjemmelaget') {
        const trays = pizzaCount(units, 'hjemmelaget');
        const h = homemadePizza(trays);
        const cheeseOnly = trays - h.hamTrays;
        return [
          {
            id: 'langpanner',
            name: 'Pizza i langpanne',
            amount: plural(trays, 'langpanne', 'langpanner'),
            why: `${unitWhy}, ca. ${C.PIZZA_UNITS_PER.langpanne} per langpanne`,
          },
          {
            id: 'hvetemel',
            name: 'Hvetemel',
            amount: formatGrams(h.flourG),
            packs: `${h.flourPacks} pk à 1 kg`,
            why: `${n(h.flourDl)} dl, 8 dl per langpanne`,
          },
          {
            id: 'gjaer',
            name: 'Fersk gjær',
            amount: `${h.yeastG} g`,
            packs: `${h.yeastPacks} pk à 50 g`,
            why: '25 g per langpanne',
          },
          {
            id: 'pizzasaus',
            name: 'Pizzasaus',
            amount: plural(h.sauceJars, 'glass', 'glass'),
            why: 'Ett glass per langpanne',
          },
          {
            id: 'pizzaost',
            name: 'Revet ost',
            amount: formatGrams(h.cheeseG),
            packs: `${h.cheesePacks} pk à 350 g`,
            why: '300 g per langpanne',
          },
          {
            id: 'pizzaskinke',
            name: 'Skinke',
            amount: `${h.hamG} g`,
            packs: `${h.hamPacks} pk à 150 g`,
            why:
              cheeseOnly > 0
                ? `150 g per langpanne, på ${h.hamTrays} av ${trays}. Én i fire er bare med ost`
                : '150 g per langpanne',
          },
        ];
      }
      const pizzas = pizzaCount(units, 'frossen');
      const rounds = Math.ceil(pizzas / C.FROZEN_PIZZAS_PER_ROUND - 1e-9);
      return [
        {
          id: 'frossenpizza',
          name: 'Frossenpizza',
          amount: `${pizzas} stk`,
          why: `${unitWhy}, ca. ${C.PIZZA_UNITS_PER.frossen} per pizza`,
        },
        {
          id: 'ovnstid',
          name: 'Steking',
          amount: `ca. ${rounds * C.FROZEN_ROUND_MIN} min`,
          why: `${C.FROZEN_PIZZAS_PER_ROUND} om gangen i ovnen, ${plural(rounds, 'runde', 'runder')} à ca. ${C.FROZEN_ROUND_MIN} min`,
        },
      ];
    }
    case 'taco': {
      const t = taco(people);
      const buf = `+ ${pct(C.TACO_BUFFER)} ekstra`;
      const isberg = Math.max(1, Math.ceil(t.isberg - 1e-9));
      return [
        {
          id: 'kjottdeig',
          name: 'Kjøttdeig',
          amount: formatGrams(t.meatG),
          packs: `${t.meatPacks} pk à ${C.TACO_MEAT_PACK_G} g`,
          why: `${perPerson(C.TACO_MEAT_G[b], C.TACO_MEAT_G_ADULT, 'g', c)} ${buf}`,
        },
        {
          id: 'tortillas',
          name: 'Tortillas',
          amount: `${t.tortillaPacks * C.TACO_TORTILLA_PACK} stk`,
          packs: `${t.tortillaPacks} pk à ${C.TACO_TORTILLA_PACK}`,
          why: `${perPerson(C.TACO_TORTILLA[b], C.TACO_TORTILLA_ADULT, '', c)} ${buf} = ${t.tortillas}`,
        },
        {
          id: 'tacoost',
          name: 'Revet ost',
          amount: formatGrams(t.cheeseG),
          packs: `${t.cheesePacks} pk à ${C.TACO_CHEESE_PACK_G} g`,
          why: `${perPerson(C.TACO_CHEESE_G[b], C.TACO_CHEESE_G_ADULT, 'g', c)} ${buf}`,
        },
        {
          id: 'tacokrydder',
          name: 'Tacokrydder, mild',
          amount: plural(t.spiceBags, 'pose', 'poser'),
          why: 'Én pose per 2 pakker kjøttdeig',
        },
        {
          id: 'tacotilbehor',
          name: 'Mais, rømme og tacosaus',
          amount: `${t.mais} av hver`,
          why: enoughFor(
            t.mais,
            people.kidsComing + people.adultsEating,
            C.TACO_SIDES_PER_EATERS,
            'Én boks mais, ett beger rømme og ett glass tacosaus',
            (k) => `${k} av hver`,
          ),
        },
        {
          id: 'isberg',
          name: 'Isbergsalat, agurk og tomat',
          amount: `${isberg} av hver`,
          why: enoughFor(
            isberg,
            people.kidsComing + people.adultsEating,
            C.TACO_SIDES_PER_EATERS * 2,
            'Ett isbergsalathode, én agurk og et par tomater',
            (k) => `${k} av hver`,
          ),
        },
      ];
    }
    case 'pasta': {
      const x = pasta(menu.style, people);
      const first: RawLine = {
        id: 'pasta',
        name: menu.style === 'salat' ? 'Pasta (skruer)' : 'Pasta',
        amount: formatGrams(x.pastaPacks * C.PASTA_PACK_G),
        packs: `${x.pastaPacks} pk à ${C.PASTA_PACK_G} g`,
        why: `${perPerson(C.PASTA_DRY_G[b], C.PASTA_DRY_G_ADULT, 'g tørr pasta', c)} + ${pct(C.PASTA_BUFFER)} ekstra = ${formatGrams(x.pastaG)}`,
      };
      if (menu.style === 'salat')
        return [
          first,
          {
            id: 'pastaskinke',
            name: 'Skinke i terninger',
            amount: `${x.hamPacks * C.PASTA_HAM_PACK_G} g`,
            packs: `${x.hamPacks} pk à ${C.PASTA_HAM_PACK_G} g`,
            why: `${perPerson(C.PASTA_HAM_G[b], C.PASTA_HAM_G_ADULT, 'g', c)} + ${pct(C.PASTA_BUFFER)} ekstra`,
          },
          {
            id: 'pastagront',
            name: 'Mais, cherrytomater og agurk',
            amount: `${x.veg} av hver`,
            why: enoughFor(
              x.veg,
              x.eaters,
              C.PASTA_VEG_PER_EATERS,
              'Én boks mais, ett beger cherrytomater og én agurk',
              (k) => `${k} av hver`,
            ),
          },
          {
            id: 'dressing',
            name: 'Dressing',
            amount: plural(x.dressing, 'flaske', 'flasker'),
            why: enoughFor(x.dressing, x.eaters, C.PASTA_DRESSING_PER_EATERS, 'Én flaske', (k) => `${k} flasker`),
          },
        ];
      return [
        first,
        {
          id: 'pastasaus',
          name: 'Tomatsaus til pasta',
          amount: plural(x.sauceJars, 'glass', 'glass'),
          why: `Ett glass holder til ca. ${C.PASTA_SAUCE_PER_PORTIONS} barn (en voksen spiser som 1,5)`,
        },
        {
          id: 'pastaost',
          name: 'Revet ost',
          amount: plural(x.cheesePacks, 'pose', 'poser'),
          why: enoughFor(x.cheesePacks, x.eaters, C.PASTA_CHEESE_PER_EATERS, 'Én pose', (k) => `${k} poser`),
        },
      ];
    }
    case 'annet':
    case 'egen':
      return [
        {
          id: 'egen',
          name: menuTitle(menu),
          amount: 'Din egen',
          why: 'Mengden til hovedretten bestemmer du. Drikke, frukt og kake under er regnet ut',
        },
      ];
  }
}

type DietGroup = 'polser' | 'pizza-hjemmelaget' | 'pizza-frossen' | 'taco' | 'pasta-salat' | 'pasta-varm' | 'annet';

function dietGroup(menu: MenuChoice): DietGroup {
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

export const DIET_LABELS: Record<DietTag, string> = {
  glutenfri: 'Glutenfri',
  laktosefri: 'Laktosefri',
  vegetar: 'Vegetar',
  'ingen-svin': 'Ingen svin',
};

/** [extra portion, note] per need and dish. Plain shopping advice, no health claims. */
const DIET_TEXT: Record<DietTag, Record<DietGroup, [string, string]>> = {
  glutenfri: {
    polser: ['1 pk glutenfrie pølsebrød eller lomper', 'Pølser kan inneholde gluten. Sjekk merkingen'],
    'pizza-hjemmelaget': ['1 pk glutenfri pizzamel eller -bunn', 'Stekes først, på eget brett'],
    'pizza-frossen': ['1 glutenfri frossenpizza', 'Stekes først, på eget brett'],
    taco: ['1 pk glutenfrie tortillas', 'Sjekk at tacokrydderet er uten gluten'],
    'pasta-salat': ['1 pk glutenfri pasta (500 g)', 'Kokes i egen kjele og blandes i egen bolle'],
    'pasta-varm': ['1 pk glutenfri pasta (500 g)', 'Kokes i egen kjele'],
    annet: ['1 ekstra porsjon uten gluten', 'Sjekk merkingen på det du kjøper'],
  },
  laktosefri: {
    polser: ['1 pk lomper eller brød uten melk', 'Lomper og pølser kan inneholde melk. Sjekk merkingen'],
    'pizza-hjemmelaget': ['1 pk laktosefri revet ost', 'Til én egen langpanne'],
    'pizza-frossen': ['1 laktosefri frossenpizza', 'Sjekk merkingen'],
    taco: ['1 laktosefri rømme og 1 pk laktosefri ost', 'Sett dem i egne skåler'],
    'pasta-salat': ['1 laktosefri dressing', 'Eller sett dressingen ved siden av'],
    'pasta-varm': ['1 pose laktosefri revet ost', 'Sett osten ved siden av, så velger hver selv'],
    annet: ['1 ekstra porsjon uten laktose', 'Sjekk merkingen på det du kjøper'],
  },
  vegetar: {
    polser: ['1 pk vegetarpølser', 'Grilles eller kokes først, på egen side eller i egen kjele'],
    'pizza-hjemmelaget': ['1 langpanne uten skinke', 'Ost og grønnsaker, f.eks. mais og paprika'],
    'pizza-frossen': ['1 vegetarpizza, f.eks. margherita', 'Stekes først'],
    taco: ['1 pk vegetarfarse eller 1 boks bønner', 'Lag den i egen panne'],
    'pasta-salat': ['1 boks bønner eller kikerter', 'Sett av en bolle uten skinke'],
    'pasta-varm': ['1 ekstra glass tomatsaus', 'Tomatsausen er uten kjøtt. Sjekk merkingen'],
    annet: ['1 ekstra porsjon uten kjøtt', 'Sett den av før resten serveres'],
  },
  'ingen-svin': {
    polser: ['1 pk kyllingpølser', 'Grilles eller kokes først, på egen side eller i egen kjele'],
    'pizza-hjemmelaget': ['1 pk kyllingpålegg til én langpanne', 'I stedet for skinke på den langpannen'],
    'pizza-frossen': ['1 pizza uten svinekjøtt', 'Sjekk merkingen'],
    taco: ['Kjøttdeig av storfe eller kylling', 'Velg ren storfe- eller kyllingdeig, ikke blandet med svin'],
    'pasta-salat': ['1 pk kyllingpålegg', 'I stedet for skinke i én bolle'],
    'pasta-varm': ['Ingen ekstra trengs', 'Tomatsausen er uten kjøtt. Sjekk merkingen'],
    annet: ['1 ekstra porsjon uten svin', 'Sjekk merkingen på det du kjøper'],
  },
};

export function dietLines(menu: MenuChoice, diets: readonly DietTag[]): RawLine[] {
  const g = dietGroup(menu);
  return C_DIET_ORDER.filter((t) => diets.includes(t)).map((t) => {
    const [extra, note] = DIET_TEXT[t][g];
    return { id: `diet-${t}`, name: DIET_LABELS[t], amount: extra, why: note };
  });
}
const C_DIET_ORDER: readonly DietTag[] = ['glutenfri', 'laktosefri', 'vegetar', 'ingen-svin'];

/** Everything the Mat screen lists for one main dish. */
export function foodPlan(input: FoodPlanInput): FoodPlan {
  const c = clampFoodCounts(input.counts);
  const people: People = { kidsComing: c.kids, adultsEating: c.adults, age: input.age };
  const e = extras(people, { muffins: false });
  const juiceL = Math.round(((c.kids * C.JUICE_DL_CHILD + c.adults * C.SAFT_DL_ADULT) / 10) * 10) / 10;
  const waterL = Math.max(1, Math.ceil(((c.kids + c.adults) * C.WATER_DL_PER_PERSON) / 10 - 1e-9));
  const raw: { id: FoodSectionId; title: string; lines: RawLine[] }[] = [
    { id: 'main', title: 'Hovedrett', lines: mainLines(input.menu, people, c, input.items ?? {}) },
    {
      id: 'drikke',
      title: 'Drikke',
      lines: [
        {
          id: 'saft',
          name: 'Saft eller jus',
          amount: plural(e.saftBottles, 'flaske saft', 'flasker saft'),
          why: `${perPerson(C.SAFT_DL_CHILD, C.SAFT_DL_ADULT, 'dl', c)} = ca. ${n(e.saftLitres)} liter. Jus i stedet: ca. ${n(juiceL)} liter`,
        },
        {
          id: 'vann',
          name: 'Vann',
          amount: `ca. ${waterL} liter`,
          why: `En mugge på bordet, ca. ${C.WATER_DL_PER_PERSON} dl per person. Fyll på underveis`,
        },
      ],
    },
    {
      id: 'snacks',
      title: 'Frukt',
      lines: [
        {
          id: 'frukt',
          name: 'Frukt og grønt',
          amount: e.fruitDisplay,
          why: `${perPerson(C.FRUIT_G_CHILD, C.FRUIT_G_ADULT, 'g', c)}, f.eks. druer, epler, agurk og gulrot`,
        },
        // no candy: it belongs to the goodie bags (godteposer), a later PR (docs/ARCHITECTURE.md)
      ],
    },
    {
      id: 'kake',
      title: 'Til kaken',
      lines: [
        {
          id: 'kake',
          name: 'Kake',
          amount: `ca. ${e.cakePieces} biter`,
          why:
            input.celebrants > 1
              ? 'Én bit til alle, og litt til. Kaken velger du under Kake senere. Ett lys-sett per bursdagsbarn'
              : 'Én bit til alle, og litt til. Kaken velger du under Kake senere',
        },
      ],
    },
  ];
  const diet = dietLines(input.menu, input.diets);
  if (diet.length) raw.splice(1, 0, { id: 'hensyn', title: 'Allergier og hensyn', lines: diet });
  const items = input.items ?? {};
  const sections: FoodSection[] = raw.map((sec) => ({
    ...sec,
    lines: sec.lines.map((l) => {
      const toggleable = TOGGLE_SECTIONS.includes(sec.id) && !NOT_TOGGLEABLE.has(l.id);
      return { ...l, toggleable, included: !toggleable || items[l.id]?.included !== false };
    }),
  }));
  return { title: menuTitle(input.menu), forWhom: forWhom(c), sections };
}

/** The Mat screen for a party, or null while no menu is chosen. */
export function partyFoodPlan(p: Party): FoodPlan | null {
  if (!p.menu) return null;
  return foodPlan({
    menu: p.menu,
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
  const mainSection = plan.sections.find((s) => s.id === 'main')!.lines;
  const main = mainSection[0];
  const saft = plan.sections.find((s) => s.id === 'drikke')!.lines.find((l) => l.id === 'saft')!;
  let first: string | null = null;
  if (main.included) {
    if (main.amount.endsWith(' stk')) first = `${main.amount.slice(0, -4)} ${main.name.toLowerCase()}`;
    else if (main.id === 'langpanner') first = main.amount;
  }
  if (first && (main.id === 'grillpolser' || main.id === 'wienerpolser')) {
    const sides = mainSection
      .filter((l) => SAUSAGE_SIDES.includes(l.id) && l.included)
      .map((l) => l.name.toLowerCase());
    if (sides.length) first += ` med ${sides.join(' og ')}`;
  }
  return {
    title: plan.title,
    line: [first, saft.included ? saft.amount : null, plan.forWhom].filter(Boolean).join(' · '),
  };
}
