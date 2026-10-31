/**
 * Festdagen (Oct 2026): the small jobs ON the party day, each at a soft clock time counted back from the
 * party's own suggested order (rules/programme.ts `programmeTimeline`). They are ordinary to-dos (dated the
 * party day, rules/todos.ts), so a tick on Festdagen is the same tick in Gjøremål. Only what the plan already
 * knows: the dishes picked on Mat, the cake from Kake, the ideas from Program and the goodie bags. Nothing is
 * assumed when something is not chosen yet (no menu → no food job). Always «ca.»: a suggestion, never a rule.
 */
import type { Dish, HHMM, Party } from '../model';
import { cakePlan } from './cake';
import { menuDishes } from './dishes';
import { fromMinutes, formatClock, minutesOf } from './dates';
import { goodieBagsOn } from './goodieBags';
import { partyActivityName, pickedActivities, programmeTimeline } from './programme';
import { t } from '../../i18n/i18n';

export interface DayPrepRow {
  /** Stable to-do id (`dayFood-grill`, `dayCake`, `dayBags`, `dayActivities`). */
  id: string;
  /** The suggested clock time, 'HH:MM'. */
  time: HHMM;
  title: string;
  detail: string;
  link?: { label: string; route: string };
}

/** Which food job a dish needs, and how long before the meal it is started (minutes, a soft guess). */
type FoodJob = 'grill' | 'wiener' | 'pizzaOven' | 'pizzaOrdered' | 'taco' | 'pastaHot' | 'pastaSalad' | 'other';

export const FOOD_LEAD_MIN: Readonly<Record<FoodJob, number>> = {
  grill: 30,
  wiener: 15,
  pizzaOven: 25,
  pizzaOrdered: 15,
  taco: 25,
  pastaHot: 20,
  pastaSalad: 10,
  other: 20,
};

function foodJob(d: Dish): FoodJob {
  switch (d.kind) {
    case 'grillpolser':
      return 'grill';
    case 'wienerpolser':
      return 'wiener';
    case 'pizza':
      return d.style === 'bestilt' ? 'pizzaOrdered' : 'pizzaOven';
    case 'taco':
      return 'taco';
    case 'pasta':
      return d.style === 'salat' ? 'pastaSalad' : 'pastaHot';
    default:
      return 'other';
  }
}

/** Ready the cake this long before it is served: a bought cake may stand cold, so a little longer. */
export const CAKE_LEAD_MIN = { buy: 30, home: 10 } as const;
/** Set out the goodie bags / find the play things this long before the guests come. */
export const BAGS_LEAD_MIN = 15;
export const ACTIVITIES_LEAD_MIN = 45;
/** The skattejakt's «gjem godteposene» (an existing to-do) gets this soft time on Festdagen. */
export const HIDE_TREASURE_LEAD_MIN = 30;

/** 'HH:MM' this many minutes before `at`, on a 24-hour clock. */
export function clockBefore(at: HHMM, minutes: number): HHMM {
  const day = 24 * 60;
  return fromMinutes((((minutesOf(at) - minutes) % day) + day) % day);
}

/** The jobs of the day, in clock order. Each one is a to-do on the party day (rules/todos.ts). */
export function dayPrepRows(p: Party): DayPrepRow[] {
  const timeline = programmeTimeline(p);
  const clockOf = (id: string) => timeline.find((b) => b.id === id)?.clock ?? p.start;
  const food = clockOf('food');
  const cakeAt = clockOf('cake');
  const homeAt = clockOf('home');
  const rows: DayPrepRow[] = [];

  const picked = pickedActivities(p);
  if (picked.length) {
    const time = clockBefore(p.start, ACTIVITIES_LEAD_MIN);
    rows.push({
      id: 'dayActivities',
      time,
      title: t('day.prep.activities.title'),
      detail: t('day.prep.activities.detail', {
        time: formatClock(p.start),
        names: picked.map((id) => partyActivityName(id, p)).join(', '),
      }),
      link: { label: t('rules.todos.programmeLink'), route: '/program' },
    });
  }

  // one job per kind of food (pølser + pizza = two), never one for a menu she has not picked
  const jobs: FoodJob[] = [];
  for (const d of menuDishes(p.menu)) {
    const job = foodJob(d);
    if (!jobs.includes(job)) jobs.push(job);
  }
  for (const job of jobs) {
    const time = clockBefore(food, FOOD_LEAD_MIN[job]);
    rows.push({
      id: `dayFood-${job}`,
      time,
      title: t(`day.prep.food.${job}.title`),
      detail: t(`day.prep.food.${job}.detail`, { time: formatClock(time), food: formatClock(food) }),
      link: { label: t('plan.cards.food.title'), route: '/mat' },
    });
  }

  const cake = cakePlan(p);
  const joint = p.celebrants.length > 1;
  const cakeKind = cake.kind === 'buy' ? 'buy' : cake.kind === 'muffins' ? 'muffins' : 'home';
  const cakeTime = clockBefore(cakeAt, cake.kind === 'buy' ? CAKE_LEAD_MIN.buy : CAKE_LEAD_MIN.home);
  const cakeDetail = t(`day.prep.cake.${cakeKind}.detail`, {
    time: formatClock(cakeTime),
    cake: formatClock(cakeAt),
  });
  rows.push({
    id: 'dayCake',
    time: cakeTime,
    title: t(`day.prep.cake.${cakeKind}.title`),
    detail: joint ? `${cakeDetail}. ${t('rules.todos.candleNote')}` : cakeDetail,
    link: { label: t('plan.cards.cake.title'), route: '/kake' },
  });

  // with a skattejakt the bags are hidden instead (its own to-do, «Gjem godteposene …»)
  if (goodieBagsOn(p) && !picked.includes('skattejakt')) {
    rows.push({
      id: 'dayBags',
      time: clockBefore(p.start, BAGS_LEAD_MIN),
      title: t('day.prep.bags.title'),
      detail: t('day.prep.bags.detail', { time: formatClock(homeAt) }),
      link: { label: t('rules.todos.packBags.link'), route: '/godteposer' },
    });
  }

  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => minutesFromStart(p, a.r.time) - minutesFromStart(p, b.r.time) || a.i - b.i)
    .map(({ r }) => r);
}

/** Minutes from the party start, so a job late the evening before midnight still sorts first (−90 … ). */
export function minutesFromStart(p: Pick<Party, 'start'>, at: HHMM): number {
  let d = minutesOf(at) - minutesOf(p.start);
  if (d > 12 * 60) d -= 24 * 60;
  if (d < -12 * 60) d += 24 * 60;
  return d;
}
