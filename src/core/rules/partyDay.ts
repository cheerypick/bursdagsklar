/**
 * Festdagen (Oct 2026): the party day on one screen, all read from the plan (no AI, nothing stored here).
 * - the checklist: the to-dos dated the party day (rules/todos.ts, incl. the jobs from rules/dayPrep.ts),
 *   with the same ticks as Gjøremål (`taskState`), in clock order;
 * - the day's order: Program's suggested order (rules/programme.ts `programmeTimeline`) with the food, the
 *   cake and song, the goodie bags and the pickup at the end time;
 * - allergies and notes: the guests' notes from Gjesteliste and the needs ticked on Mat (notes only);
 * - quick facts for the links: what is left on Handleliste and the phone number on the invitation.
 */
import type { HHMM, ISODate, Party, Task } from '../model';
import { diffDays, formatClock, formatLongCap, formatRangeCompact, minutesOf } from './dates';
import { buildTasks, isDone } from './todos';
import { dayPrepRows, HIDE_TREASURE_LEAD_MIN, clockBefore, minutesFromStart } from './dayPrep';
import { partyActivityName, pickedActivities, programmeTimeline } from './programme';
import type { ActivityId } from './activities';
import { guestNotes } from './guests';
import { DIET_LABELS, foodCardSummary } from './menu';
import { handleliste } from './shopping';
import { formatPhone, resolveInvitation } from './invitation';
import { planTitle } from '../party';
import { t } from '../../i18n/i18n';

export interface DayCheckItem {
  task: Task;
  done: boolean;
  /** 'HH:MM' when the job has a soft time on the day; null for the rest (shown first: «før festen»). */
  time: HHMM | null;
}

export interface DayStep {
  id: string;
  /** «12.15» / «12:15» */
  time: string;
  title: string;
  detail?: string;
  /** A picked Program idea: its rules can be opened on Festdagen. */
  activity?: ActivityId;
}

export type DayWhen = 'before' | 'today' | 'after';

export interface PartyDayView {
  title: string;
  /** «Lørdag 7. november» */
  dateLine: string;
  /** «12–14» / «12.30–14.30» */
  timeLine: string;
  when: DayWhen;
  daysLeft: number;
  checklist: DayCheckItem[];
  steps: DayStep[];
  /** No idea picked on Program: the screen shows a soft link there. */
  noActivities: boolean;
  guestNotes: { name: string; note: string }[];
  /** The needs ticked on Mat («Glutenfri»), as labels. */
  diets: string[];
  shoppingLeft: number;
  shoppingCount: number;
  /** The phone number on the invitation, as typed; '' when none. */
  phone: string;
}

/** The parent's own times (the rest of the party-day to-dos carry none). */
function timeOf(p: Party, task: Task): HHMM | null {
  if (task.id === 'hideTreasure') return clockBefore(p.start, HIDE_TREASURE_LEAD_MIN);
  return dayPrepRows(p).find((r) => r.id === task.id)?.time ?? null;
}

/** The checklist: every to-do dated the party day except «Festdagen» itself (it points here). */
export function dayChecklist(p: Party): DayCheckItem[] {
  const tasks = buildTasks(p).tasks.filter((x) => x.date === p.date && x.id !== 'partyDay' && !x.milestone);
  return tasks
    .map((task, i) => ({ item: { task, done: isDone(p, task), time: timeOf(p, task) }, i }))
    .sort((a, b) => {
      const at = a.item.time === null ? -Infinity : minutesFromStart(p, a.item.time);
      const bt = b.item.time === null ? -Infinity : minutesFromStart(p, b.item.time);
      return at === bt ? a.i - b.i : at < bt ? -1 : 1;
    })
    .map(({ item }) => item);
}

/** «Passer fint rundt lunsj/middag» from the clock time of the food, or nothing in between. Never «maten er …». */
export function mealHint(food: HHMM): string | null {
  const m = minutesOf(food);
  if (m >= 10 * 60 + 30 && m <= 13 * 60 + 30) return t('day.steps.mealLunch');
  if (m >= 16 * 60 && m <= 19 * 60) return t('day.steps.mealDinner');
  return null;
}

/** The day's order: Program's suggestion with the details of THIS party, and the pickup at the end. */
export function daySteps(p: Party): DayStep[] {
  const food = foodCardSummary(p);
  const steps: DayStep[] = programmeTimeline(p).map((b) => {
    if (b.id === 'arrive') return { id: b.id, time: b.time, title: t('day.steps.arrive') };
    if (b.id === 'food') {
      const hint = mealHint(b.clock);
      return {
        id: b.id,
        time: b.time,
        title: food ? t('day.steps.foodChosen', { menu: food.title }) : t('day.steps.food'),
        detail: hint ?? undefined,
      };
    }
    if (b.id === 'cake')
      return {
        id: b.id,
        time: b.time,
        title: t('day.steps.cake'),
        detail: p.celebrants.length > 1 ? t('rules.todos.candleNote') : undefined,
      };
    if (b.activity) return { id: b.id, time: b.time, title: partyActivityName(b.activity, p), activity: b.activity };
    return { id: b.id, time: b.time, title: b.title };
  });
  steps.push({ id: 'pickup', time: formatClock(p.end), title: t('day.steps.pickup') });
  return steps;
}

export function partyDayView(p: Party, today: ISODate): PartyDayView {
  const days = diffDays(today, p.date);
  const list = handleliste(p);
  return {
    title: planTitle(p),
    dateLine: formatLongCap(p.date),
    timeLine: formatRangeCompact(p.start, p.end),
    when: days > 0 ? 'before' : days === 0 ? 'today' : 'after',
    daysLeft: Math.max(0, days),
    checklist: dayChecklist(p),
    steps: daySteps(p),
    noActivities: pickedActivities(p).length === 0,
    guestNotes: guestNotes(p),
    diets: p.diets.map((d) => DIET_LABELS[d]),
    shoppingLeft: Math.max(0, list.count - list.tickedCount),
    shoppingCount: list.count,
    phone: resolveInvitation(p).phone ? formatPhone(resolveInvitation(p).phone) : '',
  };
}
