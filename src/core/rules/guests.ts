/**
 * Gjesteliste (Oct 2026), from Ekaterina's request (30 Oct: «et sted hvor jeg kan legge inn navnene til
 * barna») and her decision «Soft hints». Pure and deterministic, fixed texts through t(), no AI.
 *
 * - Optional: a party with no names works exactly as before.
 * - The list holds the GUESTS. The birthday children come from setup and are already in the party's one
 *   children number (the TOTAL), so «12 navn» + Emma = 13 children.
 * - Each child: a name, an answer (Kommer / Kommer ikke / Venter på svar, «Venter» by default) and a short
 *   free-text allergy or diet note.
 * - The list NEVER changes the children number, the food or the shopping list on its own. When the list and
 *   the plan differ, `guestHint` gives a soft hint with an optional «Bruk N barn i planen» she can tap.
 * - Feed-ins, all soft: a personal «Hei Ola!» invitation per child, «Skriv navn på posene» on Godteposer,
 *   and the notes as one line on Mat (nothing auto-ticked, no amounts changed).
 * - The names stay on the device, in the party record like everything else (no server).
 */
import type { Guest, GuestStatus, Party } from '../model';
import { GUEST_STATUSES } from '../model';
import { t } from '../../i18n/i18n';
import { celebrantNames } from './celebrants';
import { clampChildren, MAX_CHILDREN } from './constants';

/** A name is kept short enough for a list row (long names still wrap, never cut off with «…» on screen). */
export const GUEST_NAME_MAX = 40;
/** «nøtter», «glutenfri», «ikke svin»: a short note, not a medical record. */
export const GUEST_NOTE_MAX = 60;
/** At most as many guests as the party can have children. */
export const MAX_GUESTS = MAX_CHILDREN;

const clean = (s: string, max: number) => s.replace(/\s+/g, ' ').trim().slice(0, max);

/** gjest-1, gjest-2 …: stable ids, never reused while the list holds a higher one. */
export function nextGuestId(guests: readonly Pick<Guest, 'id'>[]): string {
  const max = guests.reduce((n, g) => Math.max(n, Number(/^gjest-(\d+)$/.exec(g.id)?.[1] ?? 0)), 0);
  return `gjest-${max + 1}`;
}

/** Adds a child by name («Venter på svar»). A blank name, or a full list, changes nothing. */
export function withGuestAdded(p: Party, name: string): Party {
  const n = clean(name, GUEST_NAME_MAX);
  if (!n || p.guests.length >= MAX_GUESTS) return p;
  return { ...p, guests: [...p.guests, { id: nextGuestId(p.guests), name: n, status: 'pending' }] };
}

/** Takes a child off the list (nothing else changes). */
export function withGuestRemoved(p: Party, id: string): Party {
  return { ...p, guests: p.guests.filter((g) => g.id !== id) };
}

/** The family's answer: «Kommer», «Kommer ikke» or back to «Venter på svar». */
export function withGuestStatus(p: Party, id: string, status: GuestStatus): Party {
  return { ...p, guests: p.guests.map((g) => (g.id === id ? { ...g, status } : g)) };
}

/** The short allergy/diet note; a blank note removes it. */
export function withGuestNote(p: Party, id: string, note: string): Party {
  const n = clean(note, GUEST_NOTE_MAX);
  return {
    ...p,
    guests: p.guests.map((g) => {
      if (g.id !== id) return g;
      const { note: _old, ...rest } = g;
      return n ? { ...rest, note: n } : rest;
    }),
  };
}

/** Renames a child; a blank name keeps the old one. */
export function withGuestName(p: Party, id: string, name: string): Party {
  const n = clean(name, GUEST_NAME_MAX);
  if (!n) return p;
  return { ...p, guests: p.guests.map((g) => (g.id === id ? { ...g, name: n } : g)) };
}

export interface GuestCounts {
  names: number;
  yes: number;
  no: number;
  pending: number;
}

export function guestCounts(p: Pick<Party, 'guests'>): GuestCounts {
  const by = (s: GuestStatus) => p.guests.filter((g) => g.status === s).length;
  return { names: p.guests.length, yes: by('yes'), no: by('no'), pending: by('pending') };
}

/**
 * The soft hint under the list, or null when there is nothing to say (no names yet).
 * - `same`: the list and the plan agree (names + birthday children = the children number).
 * - `differs`: they differ; `fewer` when the list is shorter than the plan (maybe not everyone is written
 *   yet, which is fine).
 * - `declined`: someone answered «Kommer ikke», so maybe fewer are coming.
 * `suggested` is what the list says (names who may come + the birthday children); `canApply` is false when
 * that number is outside what the party allows, so no button is shown. Nothing here changes the party.
 */
export interface GuestHint {
  kind: 'same' | 'differs' | 'declined';
  names: number;
  declined: number;
  celebrants: string;
  planned: number;
  suggested: number;
  fewer: boolean;
  canApply: boolean;
}

export function guestHint(p: Pick<Party, 'guests' | 'children' | 'celebrants'>): GuestHint | null {
  const c = guestCounts(p);
  if (c.names === 0) return null;
  const suggested = c.names - c.no + p.celebrants.length;
  const planned = p.children;
  const kind = suggested === planned ? 'same' : c.no > 0 ? 'declined' : 'differs';
  return {
    kind,
    names: c.names,
    declined: c.no,
    celebrants: celebrantNames(p.celebrants),
    planned,
    suggested,
    fewer: suggested < planned,
    canApply: kind !== 'same' && clampChildren(suggested, p.celebrants.length) === suggested,
  };
}

/** The hint in words (the active language). */
export function guestHintText(h: GuestHint): string {
  if (h.kind === 'same') return t('guests.hint.same', { count: h.planned, names: h.celebrants });
  if (h.kind === 'declined')
    return t('guests.hint.declined', {
      count: h.declined,
      names: h.celebrants,
      suggested: h.suggested,
      planned: h.planned,
    });
  return t('guests.hint.differs', {
    count: h.names,
    names: h.celebrants,
    suggested: h.suggested,
    planned: h.planned,
  });
}

/** «Bruk 13 barn i planen»: the one children number from the list. Only when she taps it. */
export function withChildrenFromGuests(p: Party): Party {
  const h = guestHint(p);
  if (!h || !h.canApply) return p;
  return { ...p, children: h.suggested };
}

/** The guests with a note, in list order, leaving out those who said no: [{ name, note }]. */
export function guestNotes(p: Pick<Party, 'guests'>): { name: string; note: string }[] {
  return p.guests
    .filter((g) => g.status !== 'no' && g.note && g.note.trim())
    .map((g) => ({ name: g.name, note: (g.note as string).trim() }));
}

/** «Ola (nøtter), Sara (gluten)» for the soft line on Mat; '' when nobody has a note. */
export function guestNotesSummary(p: Pick<Party, 'guests'>): string {
  return guestNotes(p)
    .map((g) => t('guests.noteItem', { name: g.name, note: g.note }))
    .join(', ');
}

/** The Planen card line: «3 navn · 2 kommer», or the soft «Valgfritt: …» when unused. */
export function guestCardLine(p: Pick<Party, 'guests'>): string {
  const c = guestCounts(p);
  if (c.names === 0) return t('guests.cardEmpty');
  return t('guests.cardLine', { count: c.names, yes: c.yes });
}

/** The children a personal invitation can go to: everyone on the list except those who said no. */
export function inviteeGuests(p: Pick<Party, 'guests'>): Guest[] {
  return p.guests.filter((g) => g.status !== 'no');
}

/** The invitation with a personal greeting on top: «Hei Ola!» + the (possibly edited) invitation text. */
export function personalInvitation(name: string, text: string): string {
  return `${t('guests.inviteHello', { name })}\n\n${text}`;
}

/** Defensive read of the stored list: an old or hand-edited record still opens (Oct 2026, no schema bump). */
export function sanitizeGuests(raw: unknown): Guest[] {
  if (!Array.isArray(raw)) return [];
  const out: Guest[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const g = r as Record<string, unknown>;
    // a record from before the Gjesteliste could carry `label` instead of `name`
    const nameRaw = typeof g.name === 'string' ? g.name : typeof g.label === 'string' ? g.label : '';
    const name = clean(nameRaw, GUEST_NAME_MAX);
    if (!name) continue;
    let id = typeof g.id === 'string' && g.id && !seen.has(g.id) ? g.id : '';
    if (!id) id = nextGuestId(out);
    seen.add(id);
    const status = GUEST_STATUSES.find((s) => s === g.status) ?? 'pending';
    const note = typeof g.note === 'string' ? clean(g.note, GUEST_NOTE_MAX) : '';
    out.push({ id, name, status, ...(note ? { note } : {}) });
    if (out.length >= MAX_GUESTS) break;
  }
  return out;
}
