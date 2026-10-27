/**
 * To-dos and their dates (spec §6.1). Tasks are computed from the Party every time;
 * only `taskState` (done/hidden per task id) is stored.
 */
import type { ISODate, Party, Task } from '../model';
import { addDays, diffDays, formatLong, mondayOf, parts, weekday, weekdayName } from './dates';
import { liveRecord, t } from '../../i18n/i18n';
import { RSVP_DAYS_DEFAULT, RSVP_FULL_PLAN_MIN_AVAIL } from './constants';
import { headCount } from './people';
import { cakePlan } from './cake';
import { themeById } from '../themes';
import { isIncluded, mainItemWord } from './food';
import { dishOn, menuDishes } from './dishes';
import { kidsCount } from './units';

/** RSVP offset R (days before the party). */
export function rsvpOffset(avail: number): number {
  return avail >= RSVP_FULL_PLAN_MIN_AVAIL ? RSVP_DAYS_DEFAULT : Math.max(2, Math.floor(avail / 2));
}

/** Days before the party for a "front" task with an ideal offset of 19/18/17. */
export function frontOffset(ideal: number, avail: number, R: number): number {
  if (avail >= ideal) return ideal;
  return R + 1 + Math.floor(((ideal - 8) * (avail - R - 1)) / 11 + 0.5);
}

export interface TaskPlan {
  avail: number;
  R: number;
  rsvpDeadline: ISODate;
  tasks: Task[];
}

/** Ordered rule table; tasks on the same date keep this order. */
export function buildTasks(p: Party): TaskPlan {
  const D = p.date;
  const T = p.plannedFrom;
  const avail = diffDays(T, D);
  const R = rsvpOffset(avail);
  const at = (daysBefore: number): ISODate => {
    const d = addDays(D, -daysBefore);
    return d < T ? T : d;
  };
  const front = (ideal: number) => at(frontOffset(ideal, avail, R));
  const hc = headCount(p);
  // Nothing here depends on a theme; the theme only changes the words of a themed extra
  // (the piñata), and that to-do only exists when the parent has turned the activity on.
  const theme = p.theme ? themeById(p.theme) : null;
  // a joint birthday shares ONE cake for all guests, with a candle set for each child
  const candleNote = p.celebrants.length > 1 ? t('rules.todos.candleNote') : null;
  const pinata = p.programme.includePinata;
  const clues = p.programme.includeSkattejakt;
  // Kake (Oct 2026): the choice on the Kake screen (rules/cake.ts); an older party opens with the Toro default
  const cake = cakePlan(p);
  const bake = cake.kind !== 'buy';
  const onlyMuffins = cake.kind === 'muffins';
  const menu = p.menu;
  const pizza = dishOn(menu, 'pizza');
  const grill = menuDishes(menu).some((d) => d.kind === 'grillpolser');
  const has = (id: Party['haveAtHome'][number]) => p.haveAtHome.includes(id);

  const rows: (Task | false)[] = [
    { id: 'guestList', date: T, title: t('rules.todos.guestList.title'), detail: kidsCount(p.children), auto: true },
    {
      id: 'sendInvite',
      date: front(19),
      title: t('rules.todos.sendInvite.title'),
      detail: t('rules.todos.sendInvite.detail'),
      link: { label: t('rules.todos.sendInvite.link'), route: '/invitasjon' },
    },
    {
      id: 'printCards',
      date: front(18),
      // no count here: the one children number includes the birthday children, who get no card
      title: t('rules.todos.printCards.title'),
      detail: t('rules.todos.printCards.detail'),
      link: { label: t('rules.todos.printCards.link'), route: '/invitasjon' },
    },
    pinata &&
      avail >= 8 && {
        id: 'orderPinata',
        date: front(17),
        title: theme
          ? t('rules.todos.orderPinata.title', { pinata: theme.pinata })
          : t('rules.todos.orderPinata.titleNeutral'),
        detail: t('rules.todos.orderPinata.detail'),
      },
    pinata &&
      avail < 8 && {
        id: 'buyPinata',
        date: at(4),
        title: t('rules.todos.buyPinata.title'),
        detail: t('rules.todos.buyPinata.detail'),
      },
    // a ready-made cake: order it a few days before (REMA 1000 takes orders the day before, a bakery a little more)
    !bake && {
      id: 'orderCake',
      date: at(4),
      title: t(candleNote ? 'rules.todos.orderCake.titleJoint' : 'rules.todos.orderCake.title'),
      detail: candleNote
        ? t('rules.todos.orderCake.detailJoint', { candles: candleNote, pieces: cake.pieces })
        : t('rules.todos.orderCake.detail', { pieces: cake.pieces }),
      link: { label: t('plan.cards.cake.title'), route: '/kake' },
    },
    {
      id: 'rsvpReminder',
      date: at(R + 1),
      title: t('rules.todos.rsvpReminder.title'),
      detail: t('rules.todos.rsvpReminder.detail'),
      link: { label: t('rules.todos.rsvpReminder.link'), route: '/invitasjon' },
    },
    !has('saftdispenser') && {
      id: 'borrowDispenser',
      date: at(R + 1),
      title: t('rules.todos.borrowDispenser.title'),
      detail: t('rules.todos.borrowDispenser.detail'),
    },
    {
      id: 'rsvpDeadline',
      date: at(R),
      title: t('rules.todos.rsvpDeadline.title'),
      detail: t('rules.todos.rsvpDeadline.detail'),
      milestone: true,
    },
    {
      id: 'allergyCheck',
      date: at(Math.max(1, R - 1)),
      title: t('rules.todos.allergyCheck.title'),
      detail: t('rules.todos.allergyCheck.detail'),
      link: { label: t('rules.todos.allergyCheck.link'), route: '/mat' },
    },
    pizza?.kind === 'pizza' &&
      pizza.style === 'bestilt' && {
        id: 'orderPizza',
        date: at(2),
        title: t('rules.todos.orderPizza.title'),
        detail: t(pizza.takeawaySize === '40' ? 'rules.todos.orderPizza.big' : 'rules.todos.orderPizza.normal'),
      },
    {
      id: 'buyDry',
      date: at(4),
      title: t('rules.todos.buyDry.title'),
      detail: dryDetail(p),
      link: { label: t('rules.todos.buyDry.link'), route: '/handleliste' },
    },
    bake &&
      !onlyMuffins && {
        id: 'bakeCakeBase',
        date: at(3),
        title: t('rules.todos.bakeCakeBase.title'),
        detail: t('rules.todos.bakeCakeBase.detail'),
        link: { label: t('rules.todos.bakeCakeBase.link'), route: '/kake' },
      },
    grill && { id: 'checkGrill', date: at(2), title: t('rules.todos.checkGrill.title') },
    {
      id: 'partyReminder',
      date: at(2),
      title: t('rules.todos.partyReminder.title'),
      detail: t('rules.todos.partyReminder.detail'),
      link: { label: t('rules.todos.partyReminder.link'), route: '/invitasjon' },
    },
    clues && {
      id: 'printClues',
      date: at(2),
      title: t('rules.todos.printClues.title'),
      detail: t('rules.todos.printClues.detail'),
      link: { label: t('rules.todos.printClues.link'), route: '/program' },
    },
    // only when she makes the dough herself; ready-made dough is the default
    pizza?.kind === 'pizza' &&
      pizza.style === 'hjemmelaget' &&
      pizza.dough === 'selv' && {
        id: 'makeDough',
        date: at(1),
        title: t('rules.todos.makeDough.title'),
        link: { label: t('rules.todos.makeDough.link'), route: '/mat' },
      },
    {
      id: 'buyFresh',
      date: at(1),
      title: t('rules.todos.buyFresh.title'),
      detail: menu ? t('rules.todos.buyFresh.detail', { items: mainItemWord(menu) }) : t('rules.todos.buyFresh.noMenu'),
      link: { label: t('rules.todos.buyFresh.link'), route: '/handleliste' },
    },
    bake && {
      id: 'bakeMuffins',
      date: at(1),
      title: t(
        onlyMuffins
          ? 'rules.todos.bakeMuffins.titleOnlyMuffins'
          : cake.muffinPacks > 0
            ? 'rules.todos.bakeMuffins.titleMuffins'
            : 'rules.todos.bakeMuffins.title',
      ),
      detail: candleNote
        ? t('rules.todos.bakeMuffins.detailJoint', { candles: candleNote, count: hc.kidsComing })
        : t('rules.todos.bakeMuffins.detail', { count: hc.kidsComing }),
      link: { label: t('rules.todos.bakeMuffins.link'), route: '/kake' },
    },
    {
      id: 'partyDay',
      date: D,
      title: t('rules.todos.partyDay.title'),
      detail: t('rules.todos.partyDay.detail'),
      link: { label: t('rules.todos.partyDay.link'), route: '/festdagen' },
    },
    {
      id: 'thanks',
      date: addDays(D, 1),
      title: t('rules.todos.thanks.title'),
      detail: t('rules.todos.thanks.detail'),
    },
  ];

  const tasks = rows
    .filter((r): r is Task => Boolean(r))
    .map((t, i) => ({ t, i }))
    .sort((a, b) => (a.t.date < b.t.date ? -1 : a.t.date > b.t.date ? 1 : a.i - b.i))
    .map(({ t }) => t)
    .filter((t) => !p.taskState[t.id]?.hidden);

  return { avail, R, rsvpDeadline: at(R), tasks };
}

function dryDetail(p: Party): string {
  // pølser and pizza together: pølser's bread comes first, pizzasaus after it
  const kinds = menuDishes(p.menu).map((d) => d.kind);
  // the first dry item for the dish, skipping a line the parent deselected on the Mat screen
  type DryId = 'lomper' | 'polsebrod' | 'tortillas' | 'pizzasaus' | 'pasta';
  const candidates: DryId[] = kinds.flatMap((m): DryId[] =>
    m === 'grillpolser' || m === 'wienerpolser'
      ? ['lomper', 'polsebrod']
      : m === 'taco'
        ? ['tortillas']
        : m === 'pizza'
          ? ['pizzasaus']
          : m === 'pasta'
            ? ['pasta']
            : [],
  );
  const firstId = candidates.find((id) => isIncluded(p, id));
  const first = firstId ? t(`rules.todos.buyDry.${firstId}`) : undefined;
  const saft = isIncluded(p, 'saft');
  // no candy: it moves to the goodie bags (godteposer) (picked on Handleliste)
  if (first && saft) return t('rules.todos.buyDry.firstAndSaft', { first });
  return first ?? (saft ? t('rules.todos.buyDry.saft') : t('rules.todos.buyDry.fallback'));
}

/** A task is done if ticked, or if it is automatic and not explicitly unticked. */
export function isDone(p: Party, t: Task): boolean {
  const s = p.taskState[t.id];
  if (s) return s.done;
  return Boolean(t.auto);
}

export function tickable(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.milestone);
}

export type GroupId = 'idag' | 'denneuka' | 'nesteuke' | 'festuka' | 'etter';

/** «I dag», «Denne uka» … in the active language. */
export const GROUP_TITLES: Readonly<Record<GroupId, string>> = liveRecord(
  ['idag', 'denneuka', 'nesteuke', 'festuka', 'etter'] as const,
  (id) => `rules.todos.groups.${id}`,
);

export interface TaskGroup {
  id: GroupId;
  title: string;
  tasks: { task: Task; done: boolean; overdue: boolean; overdueText?: string }[];
}

/**
 * Display groups: undone tasks dated before today go to «I dag» with «Skulle vært gjort …».
 * «Etter festen» = after the party; «Festuka» = D−6 … D; «Denne uka» = today's ISO week; the rest «Neste uke».
 */
export function groupTasks(p: Party, tasks: Task[], today: ISODate): TaskGroup[] {
  const order: GroupId[] = ['idag', 'denneuka', 'nesteuke', 'festuka', 'etter'];
  const groups = new Map<GroupId, TaskGroup>(order.map((id) => [id, { id, title: GROUP_TITLES[id], tasks: [] }]));
  const weekEnd = addDays(mondayOf(today), 6);
  const festStart = addDays(p.date, -6);
  for (const task of tasks) {
    const done = isDone(p, task);
    const overdue = !done && !task.milestone && task.date < today;
    let g: GroupId;
    if (overdue) g = 'idag';
    else if (task.date > p.date) g = 'etter';
    else if (task.date >= festStart) g = 'festuka';
    else if (task.date <= weekEnd) g = 'denneuka';
    else g = 'nesteuke';
    const { d } = parts(task.date);
    groups.get(g)!.tasks.push({
      task,
      done,
      overdue,
      overdueText: overdue ? t('rules.todos.overdue', { weekday: weekdayName(weekday(task.date)), day: d }) : undefined,
    });
  }
  return order.map((id) => groups.get(id)!).filter((g) => g.tasks.length > 0);
}

export interface Progress {
  done: number;
  total: number;
  overdue: number;
  thisWeekOpen: number;
}

export function progress(p: Party, tasks: Task[], today: ISODate): Progress {
  const t = tickable(tasks);
  const weekEnd = addDays(mondayOf(today), 6);
  return {
    done: t.filter((x) => isDone(p, x)).length,
    total: t.length,
    overdue: t.filter((x) => !isDone(p, x) && x.date < today).length,
    thisWeekOpen: t.filter((x) => !isDone(p, x) && x.date <= weekEnd).length,
  };
}

export interface NextTask {
  task: Task | null;
  /** «I dag · mandag 19. oktober» or «Tirsdag 20. oktober» */
  when: string;
  /** When nothing is due yet: «Ingenting å gjøre før mandag 19. oktober. …» */
  quiet?: string;
}

/** The next task on Planen = first undone, non-milestone task by date. */
export function nextTask(p: Party, tasks: Task[], today: ISODate): NextTask {
  const task = tickable(tasks).find((t) => !isDone(p, t)) ?? null;
  if (!task) return { task: null, when: '' };
  if (task.date <= today) return { task, when: t('rules.todos.todayWhen', { date: formatLong(today) }) };
  const quiet =
    t('rules.todos.quiet', { date: formatLong(task.date) }) +
    (task.id === 'sendInvite' ? t('rules.todos.quietInvite') : '');
  const when = formatLong(task.date);
  return { task, when: when.charAt(0).toUpperCase() + when.slice(1), quiet };
}
