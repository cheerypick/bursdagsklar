/**
 * To-dos and their dates (spec §6.1). Tasks are computed from the Party every time;
 * only `taskState` (done/hidden per task id) is stored.
 */
import type { ISODate, Party, Task } from '../model';
import { addDays, diffDays, formatLong, mondayOf, parts, weekday, WEEKDAYS } from './dates';
import { RSVP_DAYS_DEFAULT, RSVP_FULL_PLAN_MIN_AVAIL } from './constants';
import { headCount } from './people';
import { themeById } from '../themes';
import { isIncluded, mainItemWord } from './food';
import { dishOn, menuDishes } from './dishes';

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
  const candleNote = p.celebrants.length > 1 ? 'Ett lys-sett per bursdagsbarn' : null;
  const pinata = p.programme.includePinata;
  const clues = p.programme.includeSkattejakt;
  const bake = p.cake.mode === 'bake';
  const menu = p.menu;
  const pizza = dishOn(menu, 'pizza');
  const grill = menuDishes(menu).some((d) => d.kind === 'grillpolser');
  const has = (id: Party['haveAtHome'][number]) => p.haveAtHome.includes(id);

  const rows: (Task | false)[] = [
    { id: 'guestList', date: T, title: 'Lag gjestelisten', detail: `${p.children} barn`, auto: true },
    {
      id: 'sendInvite',
      date: front(19),
      title: 'Send invitasjonen',
      detail: 'Meldingen til foreldregruppa er klar',
      link: { label: 'Åpne meldingen', route: '/invitasjon' },
    },
    {
      id: 'printCards',
      date: front(18),
      // no count here: the one children number includes the birthday children, who get no card
      title: 'Skriv ut invitasjonskortene',
      detail: 'A6, to per A4. Ett til hver gjest',
      link: { label: 'Se kortet', route: '/invitasjon' },
    },
    pinata &&
      avail >= 8 && {
        id: 'orderPinata',
        date: front(17),
        title: theme ? `Bestill ${theme.pinata}` : 'Bestill piñata',
        detail: 'Levering tar ofte 3–5 dager',
      },
    pinata &&
      avail < 8 && { id: 'buyPinata', date: at(4), title: 'Kjøp piñata i butikken', detail: 'Leke- eller festbutikk' },
    !bake && {
      id: 'orderCake',
      date: at(7),
      title: candleNote ? 'Bestill én felles kake' : 'Bestill kaken',
      detail: candleNote ? `Stor nok til alle gjestene. ${candleNote}` : 'Hos bakeren eller i butikken',
    },
    {
      id: 'rsvpReminder',
      date: at(R + 1),
      title: 'Svarfrist i morgen: send påminnelse',
      detail: 'Den er ferdig skrevet, til de som ikke har svart',
      link: { label: 'Påminnelsen', route: '/invitasjon' },
    },
    !has('saftdispenser') && {
      id: 'borrowDispenser',
      date: at(R + 1),
      title: 'Lån en saftdispenser (5–8 l)',
      detail: 'Spør i foreldregruppa først',
    },
    { id: 'rsvpDeadline', date: at(R), title: 'Svarfrist', detail: 'Mengdene oppdateres automatisk', milestone: true },
    {
      id: 'allergyCheck',
      date: at(Math.max(1, R - 1)),
      title: 'Sjekk allergier mot menyen',
      detail: 'Ingen allergier meldt ennå',
      link: { label: 'Mat', route: '/mat' },
    },
    pizza?.kind === 'pizza' &&
      pizza.style === 'bestilt' && {
        id: 'orderPizza',
        date: at(2),
        title: 'Forhåndsbestill pizzaene',
        detail: pizza.takeawaySize === '40' ? 'Store, ca. 40 cm' : 'Vanlige, ca. 30 cm',
      },
    {
      id: 'buyDry',
      date: at(4),
      title: 'Handle tørrvarer',
      detail: dryDetail(p),
      link: { label: 'Handleliste', route: '/handleliste' },
    },
    bake && {
      id: 'bakeCakeBase',
      date: at(3),
      title: 'Bak kakebunnen og frys den',
      detail: 'Da er fredagen roligere',
      link: { label: 'Oppskrift', route: '/kake' },
    },
    grill && { id: 'checkGrill', date: at(2), title: 'Sjekk gassen eller kullet til grillen' },
    {
      id: 'partyReminder',
      date: at(2),
      title: 'Send påminnelse til foreldrene',
      detail: 'Den er skrevet, med adresse og tid',
      link: { label: 'Påminnelsen', route: '/invitasjon' },
    },
    clues && {
      id: 'printClues',
      date: at(2),
      title: 'Skriv ut skattejakt-lappene',
      detail: 'Og gjør fiskedammen klar',
      link: { label: 'Lappene', route: '/program' },
    },
    // only when she makes the dough herself; ready-made dough is the default
    pizza?.kind === 'pizza' &&
      pizza.style === 'hjemmelaget' &&
      pizza.dough === 'selv' && {
        id: 'makeDough',
        date: at(1),
        title: 'Lag pizzadeigen og la den heve kaldt',
        link: { label: 'Mengder', route: '/mat' },
      },
    {
      id: 'buyFresh',
      date: at(1),
      title: 'Handle ferskvarer',
      detail: menu ? `${mainItemWord(menu)}, frukt og grønt` : 'Frukt og grønt. Velg meny under Mat',
      link: { label: 'Handleliste', route: '/handleliste' },
    },
    bake && {
      id: 'bakeMuffins',
      date: at(1),
      title: p.cake.muffins ? 'Pynt kaken og bak muffins' : 'Pynt kaken',
      detail: candleNote ? `${candleNote}. Og fyll ${hc.kidsComing} godteposer` : `Og fyll ${hc.kidsComing} godteposer`,
      link: { label: 'Oppskrift', route: '/kake' },
    },
    {
      id: 'partyDay',
      date: D,
      title: 'Festdagen',
      detail: 'Dagskortet har alt i riktig rekkefølge',
      link: { label: 'Dagskortet', route: '/festdagen' },
    },
    { id: 'thanks', date: addDays(D, 1), title: 'Send takkemelding', detail: 'Den er skrevet. Og noter til neste år' },
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
  const candidates: [string, string][] = kinds.flatMap((m): [string, string][] =>
    m === 'grillpolser' || m === 'wienerpolser'
      ? [
          ['lomper', 'Lomper'],
          ['polsebrod', 'Pølsebrød'],
        ]
      : m === 'taco'
        ? [['tortillas', 'Tortillas']]
        : m === 'pizza'
          ? [['pizzasaus', 'Pizzasaus']]
          : m === 'pasta'
            ? [['pasta', 'Pasta']]
            : [],
  );
  const first = candidates.find(([id]) => isIncluded(p, id))?.[1];
  const saft = isIncluded(p, 'saft');
  // no candy: it moves to the goodie bags (godteposer) (picked on Handleliste)
  if (first && saft) return `${first} og saft`;
  return first ?? (saft ? 'Saft' : 'Det som står på handlelista');
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

export const GROUP_TITLES: Record<GroupId, string> = {
  idag: 'I dag',
  denneuka: 'Denne uka',
  nesteuke: 'Neste uke',
  festuka: 'Festuka',
  etter: 'Etter festen',
};

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
      overdueText: overdue ? `Skulle vært gjort ${WEEKDAYS[weekday(task.date)]} ${d}.` : undefined,
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
  if (task.date <= today) return { task, when: `I dag · ${formatLong(today)}` };
  const quiet =
    `Ingenting å gjøre før ${formatLong(task.date)}.` +
    (task.id === 'sendInvite' ? ' Invitasjonen er klar når du vil.' : '');
  const when = formatLong(task.date);
  return { task, when: when.charAt(0).toUpperCase() + when.slice(1), quiet };
}
