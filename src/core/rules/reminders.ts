/**
 * Påminnelser (Oct 2026): the three ready-written messages the to-dos promise, filled in from the plan.
 * Pure and deterministic, no AI, no network.
 *
 * - Svarpåminnelse (to-do `rsvpReminder`): one «Kommer Ola?» message per child still «Venter på svar» on the
 *   Gjesteliste, or one general message when the list is empty (or everyone has answered).
 * - Påminnelse før festen (to-do `partyReminder`): one message to everyone who comes.
 * - Takkemelding (to-do `thanks`): the day after, with two soft toggles the template supports: a joint
 *   gift (spleis) and things left behind.
 *
 * Every message comes in three tones (standard / kort / formell). The nb texts ARE the templates in
 * core/texts/templates.json (nb.ts reads them from there, so there is one source); en.ts has the same
 * templates written in English. Both are rendered with the same `render()` and the same slots.
 */
import type { Guest, ISODate, Party } from '../model';
import { language, t } from '../../i18n/i18n';
import { render, genitive, type Ctx } from '../texts/render';
import { diffDays, formatClock, formatLong, formatRangeCompact, weekday, weekdayName } from './dates';
import { celebrantNames, joinNames, youngestAge } from './celebrants';
import { formatPhone, resolveInvitation } from './invitation';
import { pickedActivities, outdoorPossible } from './programme';
import { ACTIVITIES } from './activities';

/** The three messages, in the order the screen shows them. Also the `m` param of /paminnelser. */
export const REMINDER_SECTIONS = ['svar', 'fest', 'takk'] as const;
export type ReminderSection = (typeof REMINDER_SECTIONS)[number];
export const isReminderSection = (x: unknown): x is ReminderSection =>
  typeof x === 'string' && (REMINDER_SECTIONS as readonly string[]).includes(x);

/** The tone switch: the template variants. */
export const REMINDER_TONES = ['standard', 'kort', 'formell'] as const;
export type ReminderTone = (typeof REMINDER_TONES)[number];

/** The to-do that each message belongs to (ticked from the screen with «Sendt»). */
export const REMINDER_TASK: Record<ReminderSection, string> = {
  svar: 'rsvpReminder',
  fest: 'partyReminder',
  takk: 'thanks',
};

/** The route a to-do links to for a section: /paminnelser?m=svar … */
export function reminderRoute(section: ReminderSection): string {
  return `/paminnelser?m=${section}`;
}

/**
 * The hosts' names («Kari og Per»), when the invitation has them. The field comes with the printable
 * invitation design (InvitationSettings.hostNames, a separate PR); until then it is simply absent and the
 * messages say «Emmas foreldre» / «Emma og familien». Read defensively so both orders of merging work.
 */
export function hostNames(p: Pick<Party, 'invitation'>): string {
  const raw = (p.invitation as { hostNames?: unknown } | undefined)?.hostNames;
  return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
}

/** «14» (nb, whole hour) / «14.30» / en «14:00». */
function endClock(end: string): string {
  if (language() === 'nb' && end.endsWith(':00')) return String(Number(end.slice(0, 2)));
  return formatClock(end);
}

/** «i morgen» / «i dag» / «lørdag 31. oktober» (en: «by tomorrow» / «today» / «by Saturday 31 October»). */
export function rsvpWords(rsvpBy: ISODate, today?: ISODate): string {
  if (today) {
    const d = diffDays(today, rsvpBy);
    if (d === 0) return t('reminders.ctx.today');
    if (d === 1) return t('reminders.ctx.tomorrow');
  }
  return t('reminders.ctx.byDate', { date: formatLong(rsvpBy) });
}

/** The allergy and diet notes from the Gjesteliste, without names: «nøtter og gluten». '' when none. */
export function allergyWords(p: Pick<Party, 'guests'>): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of p.guests) {
    if (g.status === 'no' || !g.note) continue;
    const note = g.note.trim();
    const key = note.toLowerCase();
    if (!note || seen.has(key)) continue;
    seen.add(key);
    out.push(note.charAt(0).toLowerCase() + note.slice(1));
  }
  return joinNames(out);
}

/** True when part of the party is outside: an outdoor place, or an outdoor game picked on Program. */
export function partlyOutside(p: Pick<Party, 'home' | 'programme'>): boolean {
  if (p.home.type === 'ute') return true;
  if (!outdoorPossible(p)) return false;
  const picked = pickedActivities(p);
  return ACTIVITIES.some((a) => a.outdoor && picked.includes(a.id));
}

/** What is still missing for the best messages (soft tips on the screen, never blocking). */
export function reminderGaps(p: Party): { address: boolean; phone: boolean } {
  const s = resolveInvitation(p);
  return { address: !s.address, phone: !s.phone };
}

/** Every slot the reminder templates use, filled in from the party. */
export function reminderContext(p: Party, today?: ISODate): Ctx {
  const s = resolveInvitation(p, today);
  const names = celebrantNames(p.celebrants);
  const gen = genitive(names);
  const hosts = hostNames(p);
  const home = p.home.type === 'hus' || p.home.type === 'leilighet';
  const allergies = allergyWords(p);
  return {
    barn: names,
    barns: gen,
    flere: p.celebrants.length > 1,
    dato: formatLong(p.date),
    dag: weekdayName(weekday(p.date)),
    tid: formatRangeCompact(p.start, p.end),
    slutt: endClock(p.end),
    sted: s.address ? t('reminders.ctx.at', { address: s.address }) : home ? t('reminders.ctx.atHome') : '',
    adresse: s.address,
    tlf: Boolean(s.phone),
    telefon: s.phone ? formatPhone(s.phone) : '',
    kontakt: t('reminders.ctx.contact'),
    avsendere: hosts || t('reminders.ctx.parents', { gen }),
    // «Emma, Kari og Per» / «Emma og familien» (joint: «Emma, Jonas og familien»)
    fra: hosts
      ? t('reminders.ctx.fromHosts', { names, hosts })
      : joinNames([...p.celebrants.map((c) => c.name), t('reminders.ctx.family')]),
    glad: t('reminders.ctx.happy', { count: p.celebrants.length }),
    svarfrist: formatLong(s.rsvpBy),
    svarfrist_ord: rsvpWords(s.rsvpBy, today),
    gjest: t('reminders.ctx.yourChild'),
    ute: partlyOutside(p),
    allergier: allergies,
    // «Henting kl. 14» when the parents are not staying (or the children are 7 or older)
    hente: youngestAge(p.celebrants) >= 7 || !s.parentsHelp,
    spleis: false,
    gjenglemt: false,
  };
}

function template(section: ReminderSection, tone: ReminderTone): string {
  return t(`reminders.tpl.${section}.${tone}`);
}

export interface PersonalReminder {
  guest: Guest;
  text: string;
}

export interface RsvpReminders {
  /** One «Kommer Ola?» per child still waiting for an answer (Gjesteliste status «Venter på svar»). */
  personal: PersonalReminder[];
  /** The general message (no names on the list, or everyone has answered). null when there are personal ones. */
  general: string | null;
  /** Why the general message is shown: no names yet, or everyone on the list has answered. */
  why: 'noList' | 'allAnswered' | null;
}

export function rsvpReminders(p: Party, tone: ReminderTone = 'standard', today?: ISODate): RsvpReminders {
  const ctx = reminderContext(p, today);
  const tpl = template('svar', tone);
  const waiting = p.guests.filter((g) => g.status === 'pending');
  if (waiting.length)
    return {
      personal: waiting.map((guest) => ({ guest, text: render(tpl, { ...ctx, gjest: guest.name }) })),
      general: null,
      why: null,
    };
  return { personal: [], general: render(tpl, ctx), why: p.guests.length ? 'allAnswered' : 'noList' };
}

export function partyReminderText(p: Party, tone: ReminderTone = 'standard', today?: ISODate): string {
  return render(template('fest', tone), reminderContext(p, today));
}

export interface ThanksOptions {
  /** «Vi fikk en felles gave»: thanks for the joint gift instead of «gavene». */
  gift?: boolean;
  /** «Noen glemte noe hos oss»: the PS about things left behind. */
  forgotten?: boolean;
}

export function thanksText(
  p: Party,
  tone: ReminderTone = 'standard',
  opts: ThanksOptions = {},
  today?: ISODate,
): string {
  return render(template('takk', tone), {
    ...reminderContext(p, today),
    spleis: Boolean(opts.gift),
    gjenglemt: Boolean(opts.forgotten),
  });
}

/** The guests who come (not «Kommer ikke») — the party reminder goes to them. */
export function comingCount(p: Pick<Party, 'guests'>): number {
  return p.guests.filter((g) => g.status !== 'no').length;
}
