/**
 * Program (Oct 2026): the activity catalog. Ekaterina's words, 27 Oct: Program is mostly IDEAS («you can have
 * these or these or these»), at least one free activity, outdoor games if the weather allows, and EVERY activity
 * comes with its rules, short and numbered, because a parent may not know them.
 *
 * This file is plain metadata (ids, ages, minutes, groups, what goes on Handleliste / Gjøremål) plus small
 * helpers that read the words through t() on the shared i18next instance. Every word lives in
 * src/i18n/nb.ts and en.ts under `program.*`. Deterministic, no AI: the photo-hunt list is picked from
 * fixed lists by theme and a round number.
 *
 * Ages are our own judgement for home parties (3–10), not a sourced fact: e.g. «Boksen går» needs kids who can
 * hide and run alone (7–10), «Sangleker» suits the youngest (3–5).
 */
import type { ThemeId } from '../model';
import { i18n, t, tDynamic } from '../../i18n/i18n';
import { themeById } from '../themes';

export type ActivityId =
  | 'skattejakt'
  | 'fotojakt'
  | 'stoppdans'
  | 'stivheks'
  | 'haienkommer'
  | 'kimslek'
  | 'hermegaasa'
  | 'gjemsel'
  | 'sangleker'
  | 'pinata'
  | 'fiskedam'
  | 'pyntmuffins'
  | 'stafett'
  | 'eggeskje'
  | 'sekkelop'
  | 'boksengaar';

/** Where the card sits under «Flere ideer»: free indoor games, games with a small cost, outdoor games. */
export type ActivityGroup = 'gratis' | 'kjope' | 'ute';

/** Things an activity may put on Handleliste (words: `program.shop.<id>`). */
export type ActivityShopId = 'pinata' | 'pinataGodteri' | 'premier' | 'muffinspynt' | 'eggTilLop';

/** To-dos an activity may add to Gjøremål (words: `program.todo.<id>`). */
export type ActivityTodoId = 'drawMap' | 'hideTreasure' | 'makePhotoList' | 'buyPinata' | 'fillPinata' | 'makeRod';

export interface ActivityMeta {
  id: ActivityId;
  group: ActivityGroup;
  /** Suitable ages, inclusive (our judgement for home parties). */
  minAge: number;
  maxAge: number;
  /** Rough length in minutes (for the suggested party-day order). */
  minutes: number;
  /** Costs nothing beyond what most homes have (the «Gratis» badge). */
  free: boolean;
  /** Only shown/suggested when the party can be outside (the «Ute» group). */
  outdoor: boolean;
  /** Works inside (= !outdoor; kept for readability in the suggestion rules). */
  indoor: boolean;
  /** Needs a phone per team (fotojakt). */
  phones?: boolean;
  /** Only suggested when Kake = muffins (pynt egne muffins). */
  needsMuffins?: boolean;
  /** Works for the youngest (3–5) as a calm, adult-led game; used when picking suggestions. */
  calm?: boolean;
  /** Extra things for Handleliste, only when the activity is chosen. */
  shopping: readonly ActivityShopId[];
  /** Extra to-dos, only when the activity is chosen. */
  todos: readonly ActivityTodoId[];
}

/** The curated catalog, in the order «Flere ideer» shows it inside each group. */
const CATALOG: readonly Omit<ActivityMeta, 'indoor'>[] = [
  // Gratis (inside)
  {
    id: 'skattejakt',
    group: 'gratis',
    minAge: 3,
    maxAge: 10,
    minutes: 20,
    free: true,
    outdoor: false,
    shopping: [],
    todos: ['drawMap', 'hideTreasure'],
  },
  {
    id: 'fotojakt',
    group: 'gratis',
    minAge: 7,
    maxAge: 10,
    minutes: 30,
    free: true,
    outdoor: false,
    phones: true,
    shopping: [],
    todos: ['makePhotoList'],
  },
  {
    id: 'stoppdans',
    group: 'gratis',
    minAge: 3,
    maxAge: 8,
    minutes: 10,
    free: true,
    outdoor: false,
    calm: true,
    shopping: [],
    todos: [],
  },
  {
    id: 'sangleker',
    group: 'gratis',
    minAge: 3,
    maxAge: 5,
    minutes: 10,
    free: true,
    outdoor: false,
    calm: true,
    shopping: [],
    todos: [],
  },
  {
    id: 'hermegaasa',
    group: 'gratis',
    minAge: 3,
    maxAge: 7,
    minutes: 10,
    free: true,
    outdoor: false,
    calm: true,
    shopping: [],
    todos: [],
  },
  {
    id: 'kimslek',
    group: 'gratis',
    minAge: 5,
    maxAge: 10,
    minutes: 10,
    free: true,
    outdoor: false,
    shopping: [],
    todos: [],
  },
  {
    id: 'gjemsel',
    group: 'gratis',
    minAge: 4,
    maxAge: 10,
    minutes: 15,
    free: true,
    outdoor: false,
    shopping: [],
    todos: [],
  },
  {
    id: 'stivheks',
    group: 'gratis',
    minAge: 4,
    maxAge: 10,
    minutes: 10,
    free: true,
    outdoor: false,
    shopping: [],
    todos: [],
  },
  {
    id: 'haienkommer',
    group: 'gratis',
    minAge: 4,
    maxAge: 9,
    minutes: 10,
    free: true,
    outdoor: false,
    shopping: [],
    todos: [],
  },
  // Litt å kjøpe
  {
    id: 'pinata',
    group: 'kjope',
    minAge: 4,
    maxAge: 10,
    minutes: 15,
    free: false,
    outdoor: false,
    shopping: ['pinata', 'pinataGodteri'],
    todos: ['buyPinata', 'fillPinata'],
  },
  {
    id: 'fiskedam',
    group: 'kjope',
    minAge: 3,
    maxAge: 7,
    minutes: 20,
    free: false,
    outdoor: false,
    calm: true,
    shopping: ['premier'],
    todos: ['makeRod'],
  },
  {
    id: 'pyntmuffins',
    group: 'kjope',
    minAge: 3,
    maxAge: 10,
    minutes: 20,
    free: false,
    outdoor: false,
    needsMuffins: true,
    calm: true,
    shopping: ['muffinspynt'],
    todos: [],
  },
  // Ute (hvis været tillater)
  {
    id: 'stafett',
    group: 'ute',
    minAge: 5,
    maxAge: 10,
    minutes: 15,
    free: true,
    outdoor: true,
    shopping: [],
    todos: [],
  },
  {
    id: 'eggeskje',
    group: 'ute',
    minAge: 4,
    maxAge: 10,
    minutes: 10,
    free: false,
    outdoor: true,
    shopping: ['eggTilLop'],
    todos: [],
  },
  {
    id: 'sekkelop',
    group: 'ute',
    minAge: 5,
    maxAge: 10,
    minutes: 10,
    free: true,
    outdoor: true,
    shopping: [],
    todos: [],
  },
  {
    id: 'boksengaar',
    group: 'ute',
    minAge: 7,
    maxAge: 10,
    minutes: 20,
    free: true,
    outdoor: true,
    shopping: [],
    todos: [],
  },
];

export const ACTIVITIES: readonly ActivityMeta[] = CATALOG.map((a) => ({ ...a, indoor: !a.outdoor }));

/** Same as ActivityMeta (the name programme.ts uses). */
export type ActivityDef = ActivityMeta;

export const ACTIVITY_IDS: readonly ActivityId[] = ACTIVITIES.map((a) => a.id);
export const ACTIVITY_GROUPS: readonly ActivityGroup[] = ['gratis', 'kjope', 'ute'];

/** When each activity to-do is due, in days before the party (0 = the party day, before guests come). */
export const ACTIVITY_TODO_DAYS_BEFORE: Readonly<Record<ActivityTodoId, number>> = {
  buyPinata: 7, // order/buy about a week before (theme piñatas may need shipping)
  makeRod: 2,
  fillPinata: 1,
  drawMap: 1,
  makePhotoList: 1,
  hideTreasure: 0,
};

export const isActivityId = (x: unknown): x is ActivityId =>
  typeof x === 'string' && (ACTIVITY_IDS as readonly string[]).includes(x);

export function activityById(id: ActivityId): ActivityMeta {
  const a = ACTIVITIES.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown activity: ${id}`);
  return a;
}

/** True when the activity's age range overlaps the celebrants'/guests' ages [youngest, oldest]. */
export function activityFitsAges(a: ActivityMeta, youngest: number, oldest: number = youngest): boolean {
  return a.minAge <= Math.max(youngest, oldest) && a.maxAge >= Math.min(youngest, oldest);
}

const k = (id: ActivityId, field: string) => `program.activities.${id}.${field}`;

/** «Skattejakt» / «Treasure hunt» (plain; resolveActivity(id, theme) gives the themed piñata name). */
export const activityName = (id: ActivityId) => tDynamic(k(id, 'name'));
const plainName = activityName;
/** One line for the card: «Tegn et kart, gjem godteposene, la barna lete.» */
export const activityShort = (id: ActivityId) => tDynamic(k(id, 'short'));
/** What you need, in words («Papir, blyant og godteposene»). */
export const activityNeed = (id: ActivityId) => tDynamic(k(id, 'need'));

/** The numbered rules, 3–6 lines (no numbers in the strings; the screen numbers them). */
export function activitySteps(id: ActivityId): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const key = k(id, `steps.s${i}`);
    if (i18n.exists(key)) out.push(tDynamic(key));
  }
  return out;
}

/** «3–10 år» / «ages 3–10» */
export const activityAges = (a: ActivityMeta) => t('program.ages', { min: a.minAge, max: a.maxAge });
/** «ca. 20 min» / «about 20 min» */
export const activityMinutes = (a: ActivityMeta) => t('program.minutes', { count: a.minutes });

export interface ResolvedActivity extends ActivityMeta {
  name: string;
  short: string;
  need: string;
  /** «Gratis» when free, else what you need. */
  badge: string;
  ages: string;
  minutesLabel: string;
  steps: string[];
  tipYounger: string;
  tipOlder: string;
  /** A theme line when a theme is chosen and the activity has one (the theme piñata, a themed photo list). */
  themeTip: string | null;
}

const capitalize = (x: string) => (x ? x[0].toLocaleUpperCase() + x.slice(1) : x);

/**
 * Everything a card / rules view shows, in the active language. With a theme, the piñata is named after it
 * («Dinosaur-piñata») and fotojakt/piñata get a theme line.
 */
export function resolveActivity(id: ActivityId, themeId: ThemeId | null = null): ResolvedActivity {
  const a = activityById(id);
  const need = activityNeed(id);
  let themeTip: string | null = null;
  if (themeId && id === 'pinata')
    themeTip = t('program.activities.pinata.themeTip', { pinata: themeById(themeId).pinata });
  if (themeId && id === 'fotojakt')
    themeTip = t('program.activities.fotojakt.themeTip', { name: themeById(themeId).name });
  return {
    ...a,
    name: themeId && id === 'pinata' ? capitalize(themeById(themeId).pinata) : plainName(id),
    short: activityShort(id),
    need,
    badge: a.free ? t('program.free') : need,
    ages: activityAges(a),
    minutesLabel: activityMinutes(a),
    steps: activitySteps(id),
    tipYounger: tDynamic(k(id, 'tipYounger')),
    tipOlder: tDynamic(k(id, 'tipOlder')),
    themeTip,
  };
}

/** The name programme.ts reads: same as resolveActivity. */
export const activityText = (id: ActivityId, themeId: ThemeId | null = null) => resolveActivity(id, themeId);

// ---- Handleliste and Gjøremål helpers (the wiring into shopping.ts/todos.ts lives there) ----

export interface ActivityShopLine {
  id: ActivityShopId;
  name: string;
  amount: string;
  /** Which chosen activities asked for it («Til piñata»). */
  why: string;
}

/** Godteri for the piñata: ca. 50 g per child, at least 500 g, rounded up to 100 g (our assumption). */
export function pinataCandyGrams(kids: number): number {
  return Math.max(500, Math.ceil((Math.max(0, kids) * 50) / 100) * 100);
}

/**
 * The extra Handleliste lines for the chosen activities, each once (no doubles even if two activities ask
 * for the same thing). Godteposer, ballonger, laken and fiskestang are already handled elsewhere.
 */
export function activityShopLines(chosen: readonly ActivityId[], kids: number): ActivityShopLine[] {
  const byShop = new Map<ActivityShopId, ActivityId[]>();
  for (const id of ACTIVITY_IDS) {
    if (!chosen.includes(id)) continue;
    for (const s of activityById(id).shopping) byShop.set(s, [...(byShop.get(s) ?? []), id]);
  }
  const n = Math.max(1, kids);
  const amount = (s: ActivityShopId): string => {
    switch (s) {
      case 'pinata':
        return t('program.shop.pinata.amount');
      case 'pinataGodteri':
        return t('program.shop.pinataGodteri.amount', { grams: pinataCandyGrams(n) });
      case 'premier':
        return t('program.shop.premier.amount', { count: n });
      case 'muffinspynt':
        return t('program.shop.muffinspynt.amount');
      case 'eggTilLop':
        return t('program.shop.eggTilLop.amount', { count: Math.min(n, 12) });
    }
  };
  return [...byShop.entries()].map(([id, from]) => ({
    id,
    name: tDynamic(`program.shop.${id}.name`),
    amount: amount(id),
    why: t('program.shop.why', { names: from.map(plainName).join(', ') }),
  }));
}

export interface ActivityTodo {
  id: ActivityTodoId;
  activity: ActivityId;
  title: string;
  daysBefore: number;
}

/** The extra to-dos for the chosen activities (theme piñata name in the buy to-do when a theme is set). */
export function activityTodos(chosen: readonly ActivityId[], themeId: ThemeId | null = null): ActivityTodo[] {
  const out: ActivityTodo[] = [];
  for (const id of ACTIVITY_IDS) {
    if (!chosen.includes(id)) continue;
    for (const todo of activityById(id).todos) {
      const title =
        todo === 'buyPinata' && themeId
          ? t('program.todo.buyPinataThemed', { pinata: themeById(themeId).pinata })
          : tDynamic(`program.todo.${todo}`);
      out.push({ id: todo, activity: id, title, daysBefore: ACTIVITY_TODO_DAYS_BEFORE[todo] });
    }
  }
  return out;
}

// ---- Fotojakt: the photo list ----

/** How many generic items exist in program.photoHunt.items (g1…gN) and theme items per theme (t1…t3). */
export const PHOTO_HUNT_GENERIC = 15;
export const PHOTO_HUNT_THEME = 3;
export const PHOTO_HUNT_LENGTH = 10;

/**
 * Ten things to photograph. Deterministic: `round` (0, 1, 2 …) is «Lag en ny liste» and rotates through the
 * generic list. With a theme, three theme items are mixed in (places 2, 5 and 8) and seven generic ones fill
 * the rest.
 */
export function photoHuntItems(themeId: ThemeId | null = null, round = 0): string[] {
  const nGeneric = themeId ? PHOTO_HUNT_LENGTH - PHOTO_HUNT_THEME : PHOTO_HUNT_LENGTH;
  const r = Math.max(0, Math.floor(round));
  const start = (r * nGeneric) % PHOTO_HUNT_GENERIC;
  const generic = Array.from({ length: nGeneric }, (_, i) =>
    tDynamic(`program.photoHunt.items.g${((start + i) % PHOTO_HUNT_GENERIC) + 1}`),
  );
  if (!themeId) return generic;
  const themed = Array.from({ length: PHOTO_HUNT_THEME }, (_, i) =>
    tDynamic(`program.photoHunt.theme.${themeId}.t${i + 1}`),
  );
  const out = [...generic];
  [1, 4, 7].forEach((pos, i) => out.splice(pos, 0, themed[i]));
  return out;
}

/** The share-ready text (Kopier/Del): title, how it works, the numbered list, a last line. */
export function photoHuntText(items: readonly string[], themeId: ThemeId | null = null): string {
  const title = themeId
    ? t('program.photoHunt.titleThemed', { name: themeById(themeId).name })
    : t('program.photoHunt.title');
  const lines = items.map((it, i) => `${i + 1}. ${it}`);
  return [title, t('program.photoHunt.intro'), '', ...lines, '', t('program.photoHunt.outro')].join('\n');
}
