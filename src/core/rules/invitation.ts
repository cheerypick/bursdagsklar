/**
 * Invitasjon: the invitation text, written in advance and filled in from the party (no AI, no network).
 *
 * What goes in: the birthday child(ren)'s names and ages (joint parties: «Emma og Jonas fyller 5 og 7 år»,
 * en «Emma and Jonas are turning 5 and 7»), the date (weekday + date in the active language), the time, the place (the address typed on the invitation screen),
 * a theme line when a theme is chosen (themes are optional; without one the text is neutral), and the
 * hosts' own reply details. RSVP is handled by the hosts themselves: there is no answer tracking here.
 *
 * Wording: soft, warm and simple. Nothing categorical («gjerne», «vi blir glade om …»).
 *
 * After the MVP (not built): let parents upload their own picture to the invitation card. That needs
 * image hosting (e.g. Cloudinary), so it waits; see docs/ARCHITECTURE.md «Invitasjon».
 */
import type { ISODate, InvitationSettings, Party, ReplyMode } from '../model';
import { THEMES } from '../themes';
import { addDays, capitalize, formatDayMonth, formatLong, formatRangeCompact } from './dates';
import { agesText, celebrantNames, youngestAge } from './celebrants';
import { t } from '../../i18n/i18n';

/** Fully resolved settings: every default filled in. */
export interface ResolvedInvitation {
  address: string;
  phone: string;
  parentsHelp: boolean;
  siblings: boolean;
  rsvpBy: ISODate;
  replyMode: ReplyMode;
  customText: string | null;
}

/** Text fields are capped so a pasted novel cannot break the card. */
export const INVITATION_ADDRESS_MAX = 120;
export const INVITATION_PHONE_MAX = 24;
export const INVITATION_TEXT_MAX = 2000;

/**
 * One helping parent per this many guest children, rounded up (Oct 2026 assumption: «1 per 3–4
 * children»; 4 keeps the shopping on the safe side without over-buying). 11 guests → 3 parents.
 */
export const CHILDREN_PER_HELPING_PARENT = 4;

/** The checkbox is pre-ticked when the youngest birthday child turns 3 or 4. */
export function parentsHelpDefault(p: Pick<Party, 'celebrants'>): boolean {
  const y = youngestAge(p.celebrants);
  return y >= 3 && y <= 4;
}

/** Svarfrist by default: the day before the party (never before `today` when it is given). */
export function defaultRsvpBy(p: Pick<Party, 'date'>, today?: ISODate): ISODate {
  const dayBefore = addDays(p.date, -1);
  if (today && dayBefore < today) return today < p.date ? today : p.date;
  return dayBefore;
}

/** The svarfrist choices: from `today` up to the day before the party (the party day itself if that is all there is). */
export function rsvpBounds(p: Pick<Party, 'date'>, today: ISODate): { min: ISODate; max: ISODate } {
  const max = addDays(p.date, -1) < today ? p.date : addDays(p.date, -1);
  const min = today < max ? today : max;
  return { min, max };
}

export function resolveInvitation(
  p: Pick<Party, 'date' | 'celebrants' | 'invitation'>,
  today?: ISODate,
): ResolvedInvitation {
  const s: InvitationSettings = p.invitation ?? {};
  return {
    address: (s.address ?? '').trim(),
    phone: (s.phone ?? '').trim(),
    parentsHelp: s.parentsHelp ?? parentsHelpDefault(p),
    siblings: s.siblings ?? false,
    rsvpBy: s.rsvpBy ?? defaultRsvpBy(p, today),
    replyMode: s.replyMode ?? 'ifNotComing',
    customText: typeof s.customText === 'string' ? s.customText : null,
  };
}

/**
 * Helping parents counted in the food when the checkbox is on: one per CHILDREN_PER_HELPING_PARENT guest
 * children, rounded up. Guest children = the TOTAL children minus the birthday children (the total
 * already includes them; never counted twice). 0 when the checkbox is off.
 */
export function helpingParents(p: Pick<Party, 'children' | 'celebrants' | 'invitation'>): number {
  if (!(p.invitation?.parentsHelp ?? parentsHelpDefault(p))) return 0;
  const guests = Math.max(0, p.children - p.celebrants.length);
  return Math.ceil(guests / CHILDREN_PER_HELPING_PARENT);
}

/** «90000000» / «+47 900 00 000» → «900 00 000». Anything else is kept as typed. */
export function formatPhone(raw: string): string {
  const typed = raw.trim();
  const digits = typed.replace(/[\s.-]/g, '');
  const m = /^(?:\+47|0047)?(\d{8})$/.exec(digits);
  if (!m) return typed;
  const d = m[1];
  // mobile numbers (4xx, 9xx) are grouped 3-2-3; landlines 2-2-2-2
  return /^[49]/.test(d) ? `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5)}` : d.replace(/(\d{2})(?=\d)/g, '$1 ');
}

/**
 * The invitation's lines live in the language files (src/i18n/nb.ts and en.ts, `invite.text.*` and
 * `invite.card.*`) and are read with the shared i18next instance, like the other rules: nb is the source
 * of truth, en is written to read naturally («Emma and Jonas are turning 5 and 7»).
 */
export interface Invitation {
  /** The generated text (always available, also when the parent has her own edit). */
  generated: string;
  /** What is shown and shared: her own edit if she made one, otherwise the generated text. */
  text: string;
  edited: boolean;
  /** No phone number: show the soft tip («Tips: Legg gjerne til et telefonnummer …»). Never blocking. */
  phoneMissing: boolean;
  settings: ResolvedInvitation;
}

/** Builds the invitation text from the party. Deterministic: the same party gives the same text. */
export function buildInvitation(p: Party, today?: ISODate): Invitation {
  const s = resolveInvitation(p, today);
  const theme = p.theme ? THEMES.find((x) => x.id === p.theme) : undefined;
  const names = celebrantNames(p.celebrants);
  const lines: string[] = [];
  // a chosen theme gives its own warm opening (our own words, e.g. «Finn fram glitteret! …»)
  if (theme) lines.push(theme.copy.playful);
  else lines.push(youngestAge(p.celebrants) <= 6 ? t('invite.text.openSmall') : t('invite.text.openBig'));
  // count = the number of birthday children: en «Emma is turning 5» / «Emma and Jonas are turning 5 and 7»
  lines.push(
    t('invite.text.turns', {
      count: p.celebrants.length,
      names,
      ages: agesText(p.celebrants.map((c) => c.age)),
    }),
  );
  lines.push('');
  lines.push(t('invite.text.when', { date: capitalize(formatLong(p.date)), time: formatRangeCompact(p.start, p.end) }));
  if (s.address) lines.push(t('invite.text.where', { address: s.address }));
  else if (p.home.type === 'hus' || p.home.type === 'leilighet') lines.push(t('invite.text.whereHome'));
  const extra: string[] = [];
  if (s.parentsHelp) extra.push(t('invite.text.parentsHelp'));
  if (s.siblings) extra.push(t('invite.text.siblings'));
  if (extra.length) lines.push('', ...extra);
  lines.push('');
  const date = formatLong(s.rsvpBy);
  lines.push(
    s.replyMode === 'ifComing' ? t('invite.text.replyIfComing', { date }) : t('invite.text.replyIfNot', { date }),
  );
  if (s.phone) lines.push(t('invite.text.phone', { phone: formatPhone(s.phone) }));
  lines.push(t('invite.text.allergies'));
  lines.push('', t('invite.text.outro'), t('invite.text.greeting', { names }));
  const generated = lines.join('\n');
  // an own edit stays an own edit, also while she has emptied the field to write her own
  const edited = s.customText !== null;
  return {
    generated,
    text: edited ? (s.customText as string) : generated,
    edited,
    phoneMissing: !s.phone,
    settings: s,
  };
}

/** The reply line on the invitation card: follows the reply mode and the svarfrist. */
export function cardReplyLine(p: Pick<Party, 'date' | 'celebrants' | 'invitation'>): string {
  const s = resolveInvitation(p);
  // «13. november» never breaks between the day and the month on the card
  const date = formatDayMonth(s.rsvpBy).replace(' ', '\u00a0');
  return s.replyMode === 'ifComing' ? t('invite.card.rsvp', { date }) : t('invite.card.rsvpIfNot', { date });
}

/** Applies a change from the invitation screen. `undefined` in the patch clears a field back to its default. */
export function withInvitation(p: Party, patch: Partial<InvitationSettings>): Party {
  const next: InvitationSettings = { ...p.invitation, ...patch };
  if (next.address !== undefined) next.address = next.address.slice(0, INVITATION_ADDRESS_MAX);
  if (next.phone !== undefined) next.phone = next.phone.slice(0, INVITATION_PHONE_MAX);
  if (next.customText !== undefined) next.customText = next.customText.slice(0, INVITATION_TEXT_MAX);
  for (const k of Object.keys(next) as (keyof InvitationSettings)[]) if (next[k] === undefined) delete next[k];
  return { ...p, invitation: next };
}

/** Defensive read of a stored invitation (hand-edited or older data): wrong types are dropped. */
export function sanitizeInvitation(raw: unknown): InvitationSettings | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const out: InvitationSettings = {};
  if (typeof r.address === 'string') out.address = r.address.slice(0, INVITATION_ADDRESS_MAX);
  if (typeof r.phone === 'string') out.phone = r.phone.slice(0, INVITATION_PHONE_MAX);
  if (typeof r.parentsHelp === 'boolean') out.parentsHelp = r.parentsHelp;
  if (typeof r.siblings === 'boolean') out.siblings = r.siblings;
  if (typeof r.rsvpBy === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.rsvpBy)) out.rsvpBy = r.rsvpBy as ISODate;
  if (r.replyMode === 'ifComing' || r.replyMode === 'ifNotComing') out.replyMode = r.replyMode;
  if (typeof r.customText === 'string') out.customText = r.customText.slice(0, INVITATION_TEXT_MAX);
  return out;
}
