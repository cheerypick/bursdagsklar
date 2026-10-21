/**
 * Domain types for one birthday party.
 *
 * A Party is stored as ONE record (see src/storage/partyStore.ts) with a stable
 * uuid, createdAt/updatedAt and a schemaVersion, so it can later be synced to a
 * server as-is without a rewrite.
 */

/** 'YYYY-MM-DD', a local calendar date in Europe/Oslo. */
export type ISODate = string;
/** 'HH:MM', 24h. */
export type HHMM = string;

export type ThemeId =
  'enhjorning' | 'dinosaurer' | 'verdensrommet' | 'fotball' | 'dyr-i-skogen' | 'pokemon' | 'paw-patrol' | 'frost';

export type AllergyTag = 'notter' | 'peanott' | 'melk' | 'egg' | 'gluten' | 'ikke-svin' | 'vegetar' | 'annet';

export type HomeItemId =
  | 'grill'
  | 'langpanne'
  | 'bursdagskrone'
  | 'laken-fiskedam'
  | 'fiskestang'
  | 'muffinsformer'
  | 'saftdispenser'
  | 'kakelys'
  | 'pappkrus-og-fat'
  | 'ballonger'
  | 'pizzahjul'
  | 'stor-kjele';

/**
 * Homemade pizza's base (Mat → Pizza). Missing = 'ferdigdeig', ready-made fresh dough: parents with kids
 * rarely make their own dough, so «Lag deigen selv» is the last, small option.
 */
export type PizzaDough = 'ferdigdeig' | 'ferdigstekt' | 'miks' | 'selv';
export const PIZZA_DOUGHS: readonly PizzaDough[] = ['ferdigdeig', 'ferdigstekt', 'miks', 'selv'];

/** Topping chips on homemade pizza. Missing `toppings` = the default, skinke only. */
export type PizzaTopping = 'skinke' | 'pepperoni' | 'sopp' | 'ananas' | 'mais' | 'paprika' | 'kebab' | 'rommedressing';
export const PIZZA_TOPPINGS: readonly PizzaTopping[] = [
  'skinke',
  'pepperoni',
  'sopp',
  'ananas',
  'mais',
  'paprika',
  'kebab',
  'rommedressing',
];

/** One main dish. */
export type Dish =
  | { kind: 'grillpolser' }
  | { kind: 'wienerpolser' }
  | {
      kind: 'pizza';
      style: 'hjemmelaget' | 'frossen' | 'bestilt';
      takeawaySize?: '30' | '40';
      /** Homemade only. Missing = 'ferdigdeig'. */
      dough?: PizzaDough;
      /** Homemade only. Missing = ['skinke'] (the default); [] = none. */
      toppings?: PizzaTopping[];
    }
  | { kind: 'taco'; shells?: boolean }
  | { kind: 'pasta'; style: 'salat' | 'varm' }
  /** «Noe annet»: the parent's own words; only drinks, snacks and cake are calculated. */
  | { kind: 'annet'; text: string }
  | {
      kind: 'egen';
      name: string;
      unit: 'stk' | 'porsjoner' | 'g' | 'dl';
      perChild: number;
      perAdult: number;
      bufferPct: 0 | 10 | 25 | 35;
      packSize?: number;
    };

/**
 * What the parent picked on the Mat screen: one dish, or several at once («Pølser» and «Pizza», plus
 * «Noe annet»). Several are stored as `{ kind: 'flere', dishes }` (always 2+, see rules/menu.ts
 * `menuFromDishes`), so a party saved with one dish reads exactly as before.
 */
export type MenuChoice = Dish | { kind: 'flere'; dishes: Dish[] };

export type MenuKind = MenuChoice['kind'];

/** The Mat screen's chip row: each adds a note line and one extra-portion suggestion. */
export type DietTag = 'glutenfri' | 'laktosefri' | 'vegetar' | 'ingen-svin';
export const DIET_TAGS: readonly DietTag[] = ['glutenfri', 'laktosefri', 'vegetar', 'ingen-svin'];

/** The children/adults the food is counted for: always the party's own head-count (rules/people.ts). */
export interface FoodCounts {
  kids: number;
  adults: number;
}

/**
 * One line on the Mat screen (and the matching shopping-list item, same id), as the parent left it.
 * Only lines she has touched are stored; a missing entry means included. Keyed by the line id
 * (`polsebrod`, `lomper`, `saft` …), so a line keeps its state when she switches dish and back.
 */
export interface FoodItemState {
  /** false = deselected: shown greyed and struck through, left out of the Mat card and the shopping list. */
  included: boolean;
}

/** «Forslag til innhold» for the goodie bags, the chips on Handleliste. */
export type GoodieBagItemId =
  'godteri' | 'popcorn' | 'rosiner' | 'klistremerker' | 'sapebobler' | 'viskelaer' | 'fruktstang';
export const GOODIE_BAG_ITEMS: readonly GoodieBagItemId[] = [
  'godteri',
  'popcorn',
  'rosiner',
  'klistremerker',
  'sapebobler',
  'viskelaer',
  'fruktstang',
];

export interface GoodieBags {
  /** The suggestions she tapped, each a line on the list. Empty by default: nothing is assumed. */
  contents: GoodieBagItemId[];
}

/** A free-text item she added herself on Handleliste («Legg til vare»). */
export interface CustomShoppingItem {
  /** Stable within the party ('egen-1', 'egen-2' …). */
  id: string;
  text: string;
}

/**
 * Handleliste state. The list itself is generated from the party (rules/shopping.ts) every time, so a
 * menu change, a deselected food line or a new children count updates it; only the ticks and her
 * own items are stored. A tick is keyed by the item's stable id (`grillpolser`, `godteri`, `egen-1`),
 * so it survives a change in the amounts.
 */
export interface ShoppingState {
  ticked: string[];
  custom: CustomShoppingItem[];
}

export interface CakeChoice {
  mode: 'bake' | 'buy';
  cakeId: string;
  muffins: boolean;
}

export interface Guest {
  id: string;
  label: string;
  status: 'pending' | 'yes' | 'no';
  adultsStaying: 0 | 1 | 2;
  allergies: AllergyTag[];
  note?: string;
}

export interface TaskState {
  done: boolean;
  doneAt?: string;
  hidden?: boolean;
}

/**
 * v6 (Oct 2026): Handleliste. `shopping` (ticked item ids + her own items) and `goodieBags`
 * (`contents`: the goodie-bag suggestions she picked; none by default). Old parties get an empty list
 * state and no goodie-bag contents.
 * v4 (Oct 2026): `foodCounts` is gone: the Mat screen edits the party's own numbers (one source of
 * truth for the guest count), and `foodItems` holds the per-line `included` flag (deselect pølsebrød).
 * v5 (Oct 2026): ONE children number. `children` is the total number of children at the party,
 * birthday children included (it replaces `kidsInvited`, which did not count them, and the unused
 * `siblingsAttending`). Planen, the food, the to-dos and every text use it as is, with no ±1.
 * v3 (Oct 2026): `menu` is null until the parent picks one on the Mat screen (`menuChosen` is gone),
 * plus `diets` (the Mat chip row) and `foodCounts` (the Mat screen's own child/adult steppers).
 * v2 (Oct 2026): `child` became `celebrants` (joint birthdays: siblings or 2–3 kindergarten
 * friends), `theme` became optional (chosen later, on Planen) and `home.type` gained 'lokale'/'ute'.
 * Older records are upgraded in storage/PartyRepository.ts `migrate`.
 */
export const SCHEMA_VERSION = 6 as const;

/** The ages the app plans for (3–10). A 1-year-old's party is a family coffee party, not this. */
export const MIN_AGE = 3;
export const MAX_AGE = 10;
/** A joint birthday has at most three children. */
export const MAX_CELEBRANTS = 3;

/** One birthday child. A party has 1–3 of them. */
export interface Celebrant {
  /** Stable within the party ('c1', 'c2' …). */
  id: string;
  name: string;
  age: number;
}

/** Where the party is held. */
export type PlaceType = 'hus' | 'leilighet' | 'lokale' | 'ute';

export interface Party {
  /** Stable id (crypto.randomUUID). Never changes, also not when synced. */
  id: string;
  schemaVersion: typeof SCHEMA_VERSION;
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
  /** The day the to-do dates were computed from; reset when the party date changes. */
  plannedFrom: ISODate;
  /** The birthday children, 1–3, in the order the parent entered them. */
  celebrants: Celebrant[];
  date: ISODate;
  start: HHMM;
  end: HHMM;
  /** Optional: chosen on Planen («Velg tema»). null = the neutral brand look and neutral texts. */
  theme: ThemeId | null;
  home: { type: PlaceType | null; garden: boolean | null };
  /**
   * Children at the party IN TOTAL, the birthday children included («Hvor mange barn blir det?»).
   * The one children number: Planen, Mat, to-dos and texts all show it as is. 2..40
   */
  children: number;
  hostAdults: number;
  /** The main dish, picked on the Mat screen. null = not chosen yet: nothing assumes a menu. */
  menu: MenuChoice | null;
  /** Dietary needs ticked on the Mat screen (glutenfri, laktosefri, vegetar, ingen svin). */
  diets: DietTag[];
  /** Per food line: included or deselected (see FoodItemState). Empty = everything included. */
  foodItems: Record<string, FoodItemState>;
  /**
   * Goodie bags (godteposer): what she picked from «Forslag til innhold» on Handleliste. Nothing is
   * pre-selected (everyone fills the bags with what they want); candy is never part of the food.
   */
  goodieBags: GoodieBags;
  /** Handleliste: what she has ticked off (by stable item id) and her own free-text items. */
  shopping: ShoppingState;
  cake: CakeChoice;
  programme: { includePinata: boolean; includeSkattejakt: boolean };
  guests: Guest[];
  haveAtHome: HomeItemId[];
  taskState: Record<string, TaskState>;
}

export interface Task {
  id: string;
  date: ISODate;
  title: string;
  detail?: string;
  link?: { label: string; route: string };
  /** Shown, but not tickable (the RSVP deadline). */
  milestone?: boolean;
  /** Done automatically at setup (the guest list). */
  auto?: boolean;
}

export type ShoppingUnit = 'stk' | 'g' | 'dl' | 'l' | 'pk' | 'boks' | 'flaske' | 'pose' | 'glass' | 'beger';

export interface ShoppingItem {
  id: string;
  name: string;
  why?: string;
  need: number;
  unit: ShoppingUnit;
  packSize?: number;
  packs?: number;
  display: string;
  trip: 'torrvarer' | 'ferskvarer';
  homeItemId?: HomeItemId;
  ruleRef: string;
}
