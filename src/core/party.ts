/**
 * Creating and updating a Party, and the derived numbers the screens show.
 * Pure functions: the screens never compute rules themselves.
 */
import type { HHMM, HomeItemId, ISODate, Party, ThemeId } from './model';
import { SCHEMA_VERSION } from './model';
import { DEFAULT_HOST_ADULTS, muffinsDefault, programmeDefaults } from './rules/constants';
import { diffDays, formatRangeCompact } from './rules/dates';
import { defaultMenu, MENU_NAMES } from './rules/food';
import { headCount } from './rules/people';
import { buildTasks, progress } from './rules/todos';
import { themeById } from './themes';

export interface SetupDraft {
  name: string;
  age: number | null;
  date: ISODate | null;
  /** What the parent typed, shown back in big type. */
  dateText: string;
  start: HHMM | null;
  end: HHMM | null;
  kidsInvited: number;
  theme: ThemeId | null;
}

export const EMPTY_DRAFT: SetupDraft = {
  name: '',
  age: null,
  date: null,
  dateText: '',
  start: null,
  end: null,
  kidsInvited: 10,
  theme: null,
};

export function draftComplete(d: SetupDraft): boolean {
  return Boolean(d.name.trim() && d.age && d.date && d.start && d.end && d.theme && d.kidsInvited > 0);
}

/** Builds a new Party from a completed setup. `newId` is injected so tests are deterministic. */
export function createParty(d: SetupDraft, opts: { id: string; now: string; today: ISODate }): Party {
  if (!draftComplete(d)) throw new Error('Setup is not complete');
  const age = d.age!;
  return {
    id: opts.id,
    schemaVersion: SCHEMA_VERSION,
    createdAt: opts.now,
    updatedAt: opts.now,
    plannedFrom: opts.today,
    child: { name: d.name.trim(), age },
    date: d.date!,
    start: d.start!,
    end: d.end!,
    theme: d.theme!,
    home: { type: null, garden: null },
    kidsInvited: d.kidsInvited,
    siblingsAttending: 0,
    hostAdults: DEFAULT_HOST_ADULTS,
    menu: defaultMenu(d.date!),
    menuChosen: false,
    cake: {
      mode: 'bake',
      cakeId: age <= 6 ? 'vaniljekake-langpanne' : 'sjokoladekake-langpanne',
      muffins: muffinsDefault(age),
    },
    programme: programmeDefaults(age),
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
  return all.filter((id) => {
    if (id === 'pizzahjul') return p.menu.kind === 'pizza';
    if (id === 'stor-kjele') return p.menu.kind === 'wienerpolser';
    if (id === 'grill') return p.menu.kind === 'grillpolser';
    return true;
  });
}

export interface PartySummary {
  daysLeft: number;
  countdownLabel: string;
  kidsComing: number;
  adultsEating: number;
  menuLine: string;
  cakeLine: string;
  programmeLine: string;
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
  const theme = themeById(p.theme);
  const countdownLabel = daysLeft === 0 ? 'I dag!' : daysLeft === 1 ? 'I morgen!' : `${daysLeft} dager igjen`;
  const progressLine =
    `${pr.done} av ${pr.total} gjøremål er gjort. ` +
    (pr.overdue > 0 ? `${pr.overdue} ${pr.overdue === 1 ? 'ting ligger' : 'ting ligger'} etter.` : 'Godt i rute.');
  const tid = formatRangeCompact(p.start, p.end);
  return {
    daysLeft,
    countdownLabel,
    kidsComing: hc.kidsComing,
    adultsEating: hc.adultsEating,
    menuLine: `${MENU_NAMES[p.menu.kind]} for ${hc.kidsComing} barn og ${hc.adultsEating} voksne`,
    cakeLine: p.cake.mode === 'buy' ? 'Kake fra bakeren' : `${theme.cake}${p.cake.muffins ? ' og muffins' : ''}`,
    programmeLine: `Program ${tid}${p.programme.includeSkattejakt ? ' med skattejakt' : ''}`,
    tasksThisWeek: pr.thisWeekOpen,
    done: pr.done,
    total: pr.total,
    overdue: pr.overdue,
    progressLine,
    percentDone: pr.total ? Math.round((pr.done / pr.total) * 100) : 0,
  };
}
