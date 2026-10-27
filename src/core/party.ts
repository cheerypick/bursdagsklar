/**
 * Creating and updating a Party, and the derived numbers the screens show.
 * Pure functions: the screens never compute rules themselves.
 */
import type {
  Celebrant,
  DietTag,
  Dish,
  HHMM,
  HomeItemId,
  ISODate,
  MenuChoice,
  Party,
  PlaceType,
  ThemeId,
} from './model';
import { menuDishes, menuFromDishes, withDishOn, type MenuCardId } from './rules/dishes';
import { MAX_CELEBRANTS, SCHEMA_VERSION } from './model';
import {
  clampChildren,
  DEFAULT_CHILDREN,
  DEFAULT_HOST_ADULTS,
  MAX_CHILDREN,
  minChildren,
  programmeDefaults,
} from './rules/constants';
import { diffDays, formatRangeCompact, isWeekend } from './rules/dates';
import { defaultPartyTime } from './rules/partyTime';
import { menuTitle } from './rules/menu';
import { headCount } from './rules/people';
import { CAKE_IDS, cakeChoiceLine, cakePlan, resolveCake } from './rules/cake';
import { buildTasks, progress } from './rules/todos';
import { isPicked, pickedActivities, programmeChoiceLine } from './rules/programme';
import { themeById } from './themes';
import { agePhrase, celebrantNames, clampAge, oldestAge, youngestAge } from './rules/celebrants';
import { genitive } from './texts/render';
import { t } from '../i18n/i18n';
import { adultsCount, kidsCount } from './rules/units';

/** A birthday child while setup is still running: the age may not be picked yet. */
export interface DraftCelebrant {
  id: string;
  name: string;
  age: number | null;
}

export interface SetupDraft {
  /** 1–3 birthday children. */
  celebrants: DraftCelebrant[];
  date: ISODate | null;
  /** The picked date as text (kept for drafts saved by older versions). */
  dateText: string;
  start: HHMM | null;
  end: HHMM | null;
  /** True once the parent has changed the time by hand; then a new date or age keeps it. */
  timeEdited?: boolean;
  /** Children at the party in total, the birthday children included («Hvor mange barn blir det?»). */
  children: number;
  /** Where the party is held (the last setup step). */
  place: PlaceType | null;
}

export const EMPTY_DRAFT: SetupDraft = {
  celebrants: [{ id: 'c1', name: '', age: null }],
  date: null,
  dateText: '',
  start: null,
  end: null,
  timeEdited: false,
  children: DEFAULT_CHILDREN,
  place: null,
};

/**
 * A draft read from storage, made current: older drafts had one `name`/`age` and a `theme`
 * (the theme is now chosen on Planen, so it is dropped); ages outside 3–10 are cleared. Older drafts
 * counted invited children without the birthday children (`kidsInvited`); that becomes the total.
 */
export function normalizeDraft(raw: unknown): SetupDraft {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<SetupDraft> & {
    name?: string;
    age?: number | null;
    kidsInvited?: number;
  };
  let celebrants: DraftCelebrant[] = Array.isArray(r.celebrants)
    ? r.celebrants.slice(0, MAX_CELEBRANTS).map((c, i) => ({
        id: typeof c?.id === 'string' ? c.id : `c${i + 1}`,
        name: typeof c?.name === 'string' ? c.name : '',
        age: typeof c?.age === 'number' ? c.age : null,
      }))
    : [{ id: 'c1', name: typeof r.name === 'string' ? r.name : '', age: typeof r.age === 'number' ? r.age : null }];
  if (celebrants.length === 0) celebrants = [{ id: 'c1', name: '', age: null }];
  celebrants = celebrants.map((c) => (c.age !== null && clampAge(c.age) !== c.age ? { ...c, age: null } : c));
  return {
    ...EMPTY_DRAFT,
    date: typeof r.date === 'string' ? r.date : null,
    dateText: typeof r.dateText === 'string' ? r.dateText : '',
    start: typeof r.start === 'string' ? r.start : null,
    end: typeof r.end === 'string' ? r.end : null,
    timeEdited: Boolean(r.timeEdited),
    children:
      typeof r.children === 'number'
        ? r.children
        : typeof r.kidsInvited === 'number'
          ? r.kidsInvited + celebrants.length
          : EMPTY_DRAFT.children,
    place: r.place ?? null,
    celebrants,
  };
}

/** The ages picked so far. */
function draftAges(d: Pick<SetupDraft, 'celebrants'>): number[] {
  return d.celebrants.map((c) => c.age).filter((a): a is number => typeof a === 'number');
}

/** Names joined for headings while setting up: «Emma», «Emma og Jonas». */
export function draftNames(d: Pick<SetupDraft, 'celebrants'>): string {
  return celebrantNames(d.celebrants);
}

/** The youngest picked age (the time reason follows it), or null before any age is picked. */
export function draftYoungest(d: Pick<SetupDraft, 'celebrants'>): number | null {
  const a = draftAges(d);
  return a.length ? Math.min(...a) : null;
}

/** The default time (weekday 17.00–19.00, weekend 12.00–14.00 or 14.00–16.00 by the youngest age) unless the parent has set their own. */
function defaultTimePatch(d: SetupDraft, age: number | null, date: ISODate | null): Partial<SetupDraft> {
  if (!date || (d.timeEdited && d.start && d.end)) return {};
  const t = defaultPartyTime(age ?? 5, isWeekend(date));
  return { start: t.start, end: t.end };
}

/** Picking a date: the default time follows the new date unless the time was edited by hand. */
export function draftWithDate(d: SetupDraft, date: ISODate): Partial<SetupDraft> {
  return { date, dateText: date, ...defaultTimePatch(d, draftYoungest(d), date) };
}

/** Changing one birthday child's name or age. */
export function draftWithCelebrant(
  d: SetupDraft,
  id: string,
  patch: Partial<Omit<DraftCelebrant, 'id'>>,
): Partial<SetupDraft> {
  const celebrants = d.celebrants.map((c) => (c.id === id ? { ...c, ...patch } : c));
  return { celebrants, ...defaultTimePatch(d, draftYoungest({ celebrants }), d.date) };
}

/** «+ Legg til et barn til» (up to three). */
export function draftAddCelebrant(d: SetupDraft): Partial<SetupDraft> {
  if (d.celebrants.length >= MAX_CELEBRANTS) return {};
  const used = new Set(d.celebrants.map((c) => c.id));
  let n = d.celebrants.length + 1;
  while (used.has(`c${n}`)) n++;
  return { celebrants: [...d.celebrants, { id: `c${n}`, name: '', age: null }] };
}

/** The × on an extra child. The first child is never removed. */
export function draftRemoveCelebrant(d: SetupDraft, id: string): Partial<SetupDraft> {
  if (d.celebrants.length <= 1) return {};
  const celebrants = d.celebrants.filter((c) => c.id !== id);
  return { celebrants };
}

/** Every child has a name and an age. */
export function celebrantsComplete(d: Pick<SetupDraft, 'celebrants'>): boolean {
  return d.celebrants.length > 0 && d.celebrants.every((c) => c.name.trim().length > 0 && c.age !== null);
}

export function draftComplete(d: SetupDraft): boolean {
  return Boolean(celebrantsComplete(d) && d.date && d.start && d.end && d.place && d.children > 0);
}

/** Builds a new Party from a completed setup. `newId` is injected so tests are deterministic. */
export function createParty(d: SetupDraft, opts: { id: string; now: string; today: ISODate }): Party {
  if (!draftComplete(d)) throw new Error('Setup is not complete');
  const celebrants: Celebrant[] = d.celebrants.map((c) => ({ id: c.id, name: c.name.trim(), age: c.age! }));
  const youngest = youngestAge(celebrants);
  return {
    id: opts.id,
    schemaVersion: SCHEMA_VERSION,
    createdAt: opts.now,
    updatedAt: opts.now,
    plannedFrom: opts.today,
    celebrants,
    date: d.date!,
    start: d.start!,
    end: d.end!,
    theme: null,
    home: { type: d.place, garden: null },
    children: clampChildren(d.children, celebrants.length),
    hostAdults: DEFAULT_HOST_ADULTS,
    // nothing is assumed: the parent picks the main dish on the Mat screen
    menu: null,
    diets: [],
    foodItems: {},
    // nothing for the goodie bags until she picks it on Handleliste («Forslag til innhold»)
    goodieBags: { contents: [] },
    shopping: { ticked: [], custom: [] },
    cake: {
      mode: 'bake',
      // one shared cake for everyone: the Toro chocolate langpanne until the parent picks on Kake (rules/cake.ts)
      cakeId: CAKE_IDS.toro,
      // off until the parent picks it on the Kake screen
      muffins: false,
    },
    programme: programmeDefaults(youngest),
    guests: [],
    haveAtHome: [],
    taskState: {},
  };
}

/** Changing the date re-plans the to-dos from today (spec §6.1: plannedFrom resets). */
export function withDate(p: Party, date: ISODate, today: ISODate): Party {
  if (date === p.date) return p;
  return { ...p, date, plannedFrom: today };
}

/** Mat step 1: the main dish (null clears it, back to «not chosen»). */
export function withMenu(p: Party, menu: MenuChoice | null): Party {
  const dishes = menuDishes(menu).map((d) =>
    d.kind === 'annet' ? { kind: 'annet' as const, text: d.text.slice(0, 60) } : d,
  );
  return { ...p, menu: menuFromDishes(dishes) };
}

/** Mat: the dish on one card (Pølser, Pizza, Noe annet), or null to unpick that card. Other cards stay. */
export function withDish(p: Party, card: MenuCardId, dish: Dish | null): Party {
  return withMenu(p, withDishOn(p.menu, card, dish));
}

/** Mat chip row: toggles one dietary need. */
export function toggleDiet(p: Party, tag: DietTag): Party {
  const has = p.diets.includes(tag);
  return { ...p, diets: has ? p.diets.filter((x) => x !== tag) : [...p.diets, tag] };
}

/**
 * Mat tap toggle: include or leave out one food line (`polsebrod`, `saft` …). Stored as a clean
 * `included` flag per line id; the Mat card and the shopping list skip lines with included: false.
 */
export function withFoodItem(p: Party, id: string, included: boolean): Party {
  return { ...p, foodItems: { ...p.foodItems, [id]: { included } } };
}

/** At most this many adults on top of the parents who RSVP'd or are expected to stay. */
export const MAX_EXTRA_ADULTS = 30;

/**
 * The guest editor's bounds («Endre» on the Mat screen). Children are the party's one children number
 * (the total, birthday children included: the same number setup asked for and Planen shows); adults
 * are the adults eating, of which the host adults are the part the parent sets (the rest are
 * RSVP'd/expected parents, see people.ts).
 */
export function guestBounds(p: Party): { kidsMin: number; kidsMax: number; adultsMin: number; adultsMax: number } {
  const hc = headCount(p);
  const others = hc.adultsEating - p.hostAdults;
  return {
    kidsMin: minChildren(p.celebrants.length),
    kidsMax: MAX_CHILDREN,
    adultsMin: others,
    adultsMax: others + MAX_EXTRA_ADULTS,
  };
}

/**
 * «Endre» on the Mat screen: changes the PARTY's own numbers, the one source of truth that Planen,
 * the food, the to-dos and the shopping list all read. `children` is the total number of children
 * (birthday children included); `adults` is the wanted number of adults eating, applied through hostAdults.
 */
export function withGuestCounts(p: Party, change: { children?: number; adults?: number }): Party {
  let next = p;
  if (change.children !== undefined) {
    next = { ...next, children: clampChildren(change.children, p.celebrants.length) };
  }
  if (change.adults !== undefined) {
    const b = guestBounds(next);
    const want = Math.min(b.adultsMax, Math.max(b.adultsMin, Math.round(change.adults)));
    next = { ...next, hostAdults: want - b.adultsMin };
  }
  return next;
}

/** «Velg tema (valgfritt)» on Planen: a theme, or null for the neutral look. */
export function withTheme(p: Party, theme: ThemeId | null): Party {
  return { ...p, theme };
}

export function toggleTask(p: Party, id: string, done: boolean, now: string): Party {
  return { ...p, taskState: { ...p.taskState, [id]: { ...p.taskState[id], done, doneAt: done ? now : undefined } } };
}

export function toggleHome(p: Party, id: HomeItemId): Party {
  const has = p.haveAtHome.includes(id);
  return { ...p, haveAtHome: has ? p.haveAtHome.filter((x) => x !== id) : [...p.haveAtHome, id] };
}

/** Home items shown in «Har dere dette hjemme?», filtered by menu (spec §6.7). */
export function homeItemsFor(p: Party): HomeItemId[] {
  const all: HomeItemId[] = [
    'grill',
    'langpanne',
    'bursdagskrone',
    'laken-fiskedam',
    'fiskestang',
    'muffinsformer',
    'saftdispenser',
    'kakelys',
    'pappkrus-og-fat',
    'ballonger',
    'pizzahjul',
    'stor-kjele',
  ];
  const kinds = menuDishes(p.menu).map((d) => d.kind);
  return all.filter((id) => {
    if (id === 'pizzahjul') return kinds.includes('pizza');
    if (id === 'stor-kjele') return kinds.includes('wienerpolser') || kinds.includes('pasta');
    if (id === 'grill') return kinds.includes('grillpolser');
    // the sheet and the rod are for the fiskedam (before Program they were wrongly tied to skattejakt)
    if (id === 'laken-fiskedam' || id === 'fiskestang') return isPicked(p, 'fiskedam');
    if (id === 'muffinsformer') return cakePlan(p).muffinPacks > 0;
    return true;
  });
}

/** The cake words when no theme is chosen: nothing themed. */
/** The neutral cake words in nb (the screens read rules.party.neutralCake* in the active language). */
export const NEUTRAL_CAKE = 'Bursdagskake';
export const NEUTRAL_CAKE_IDEA = 'Bursdagskake i langpanne med strøssel og lys';

/** «Emma», «Emma og Jonas» — the birthday children's names for headings and texts. */
export function partyNames(p: Pick<Party, 'celebrants'>): string {
  return celebrantNames(p.celebrants);
}

/** Portions use the oldest child (feeds the most); the time reason and cake the youngest. */
export function partyAges(p: Pick<Party, 'celebrants'>): { youngest: number; oldest: number; all: number[] } {
  return { youngest: youngestAge(p.celebrants), oldest: oldestAge(p.celebrants), all: p.celebrants.map((c) => c.age) };
}

/** «Emmas fest er klar.» · «Festen til Emma og Jonas er klar.» */
export function readyTitle(p: Pick<Party, 'celebrants'>): string {
  return p.celebrants.length === 1
    ? t('rules.party.ready', { gen: genitive(p.celebrants[0].name) })
    : t('rules.party.readyJoint', { names: partyNames(p) });
}

/** «Emmas 5-årsdag» · «Emma og Jonas fyller 5 og 7» · «Emma og Jonas fyller 5». */
export function planTitle(p: Pick<Party, 'celebrants'>): string {
  if (p.celebrants.length === 1) {
    const age = p.celebrants[0].age;
    return t('rules.party.planTitle', { gen: genitive(p.celebrants[0].name), age, ord: englishOrdinal(age) });
  }
  return `${partyNames(p)} ${agePhrase(p.celebrants.map((c) => c.age))}`;
}

/** «st», «nd», «rd», «th» for the English «5th birthday» (the nb text does not use it). */
function englishOrdinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return 'th';
  return n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
}

export interface PartySummary {
  daysLeft: number;
  countdownLabel: string;
  kidsComing: number;
  adultsEating: number;
  menuLine: string;
  cakeLine: string;
  /** The theme's cake suggestion («Lyseblå og hvit kake med snøkrystaller»), shown on Festen er klar and Planen. */
  cakeIdea: string;
  /** Kake: the chosen cake in a few words («Toro sjokoladekake med glasur»), for the Planen card. */
  cakeChoice: string;
  /** The parent has picked or confirmed the cake on the Kake screen (the Planen card's done state). */
  cakeChosen: boolean;
  programmeLine: string;
  /** Program: the picked ideas in a few words («Skattejakt og piñata»); '' when none is picked. */
  programmeChoice: string;
  programmeCount: number;
  tasksThisWeek: number;
  done: number;
  total: number;
  overdue: number;
  progressLine: string;
  /** 0–100 for the countdown ring */
  percentDone: number;
}

export function summarize(p: Party, today: ISODate): PartySummary {
  const { tasks } = buildTasks(p);
  const hc = headCount(p);
  const pr = progress(p, tasks, today);
  const daysLeft = Math.max(0, diffDays(today, p.date));
  const theme = p.theme ? themeById(p.theme) : null;
  const countdownLabel =
    daysLeft === 0
      ? t('rules.party.today')
      : daysLeft === 1
        ? t('rules.party.tomorrow')
        : t('rules.party.daysLeft', { count: daysLeft });
  const progressLine =
    `${t('rules.party.progress', { done: pr.done, total: pr.total })} ` +
    (pr.overdue > 0 ? t('rules.party.behind', { count: pr.overdue }) : t('rules.party.onTrack'));
  const muffins = (cake: string) => (p.cake.muffins ? t('rules.party.withMuffins', { cake }) : cake);
  const tid = formatRangeCompact(p.start, p.end);
  return {
    daysLeft,
    countdownLabel,
    kidsComing: hc.kidsComing,
    adultsEating: hc.adultsEating,
    menuLine: t('rules.party.menuLine', {
      menu: p.menu ? menuTitle(p.menu) : t('rules.party.food'),
      kidsN: hc.kidsComing,
      adultsN: hc.adultsEating,
      kids: kidsCount(hc.kidsComing),
      adults: adultsCount(hc.adultsEating),
    }),
    cakeLine:
      p.cake.mode === 'buy' ? t('rules.party.cakeBakery') : muffins(theme ? theme.cake : t('rules.party.neutralCake')),
    cakeIdea:
      p.cake.mode === 'buy'
        ? t('rules.party.cakeBakery')
        : muffins(theme ? theme.copy.cakeIdea : t('rules.party.neutralCakeIdea')),
    cakeChoice: cakeChoiceLine(p),
    cakeChosen: resolveCake(p.cake).chosen,
    programmeLine: programmeChoiceLine(p)
      ? t('rules.party.programmeWith', { tid, list: programmeChoiceLine(p) })
      : t('rules.party.programme', { tid }),
    programmeChoice: programmeChoiceLine(p),
    programmeCount: pickedActivities(p).length,
    tasksThisWeek: pr.thisWeekOpen,
    done: pr.done,
    total: pr.total,
    overdue: pr.overdue,
    progressLine,
    percentDone: pr.total ? Math.round((pr.done / pr.total) * 100) : 0,
  };
}
