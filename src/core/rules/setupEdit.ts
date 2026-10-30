/**
 * «Endre festen» (Oct 2026): change the setup answers after the plan exists, without losing anything.
 *
 * The edit screen works on a SetupDraft made from the party (the same type, the same field components and
 * the same validation as setup). Saving writes the answers back onto the SAME party: everything derived
 * (food amounts, cake pieces, goodie bags, the shopping list, the to-do dates, the generated invitation text)
 * is computed from the party on every render, so it follows on its own. What the parent did herself stays:
 * ticked to-dos and shopping items (by stable id: an item that still exists is still ticked), the guest
 * list, the theme, the menu and food choices, the cake, the programme picks, the goodie bags and her own
 * invitation text. Her own text is never overwritten; when a detail it was written from changed, the party
 * remembers which (`invitationChanges`) and Invitasjon offers, softly, to make a new text.
 *
 * Pure functions; `today` is injected so tests are deterministic.
 */
import type { Celebrant, InvitationChange, ISODate, Party } from '../model';
import type { SetupDraft } from '../party';
import { draftComplete } from '../party';
import { clampChildren } from './constants';
import { addDays, dateBounds, diffDays } from './dates';

/** In «Endre festen» a day up to this far back can be picked (a soft note says it has been). */
export const EDIT_PAST_DAYS = 60;

/** The order the changes are named in («datoen og klokkeslettet»). */
export const INVITATION_CHANGES: readonly InvitationChange[] = ['date', 'time', 'celebrants', 'place'];

/**
 * The edit screen's starting point: the party's own answers. The time counts as set by hand, so picking
 * another day keeps her time (in setup the default time follows the day until she changes it).
 */
export function draftFromParty(p: Party): SetupDraft {
  return {
    celebrants: p.celebrants.map((c) => ({ id: c.id, name: c.name, age: c.age })),
    date: p.date,
    dateText: p.date,
    start: p.start,
    end: p.end,
    timeEdited: true,
    children: p.children,
    place: p.home.type,
  };
}

/** The calendar's range in «Endre festen»: the setup range, plus some days back and the party's own day. */
export function editDateBounds(today: ISODate, current: ISODate): { min: ISODate; max: ISODate } {
  const b = dateBounds(today);
  const back = addDays(today, -EDIT_PAST_DAYS);
  const min = current < back ? current : back;
  const max = current > b.max ? current : b.max;
  return { min, max };
}

/** Same rule as setup: every child has a name and an age, a date, a time and a place. */
export function setupEditValid(d: SetupDraft): boolean {
  return draftComplete(d);
}

function sameCelebrants(a: Pick<Celebrant, 'name' | 'age'>[], b: Pick<Celebrant, 'name' | 'age'>[]): boolean {
  return a.length === b.length && a.every((c, i) => c.name === b[i].name && c.age === b[i].age);
}

/** What the draft changes compared with the party (for the save button and the invitation hint). */
export interface SetupEditChanges {
  date: boolean;
  time: boolean;
  celebrants: boolean;
  children: boolean;
  place: boolean;
  any: boolean;
}

function cleanCelebrants(d: SetupDraft): Celebrant[] {
  return d.celebrants.map((c) => ({ id: c.id, name: c.name.replace(/\s+/g, ' ').trim(), age: c.age ?? 0 }));
}

export function setupEditChanges(p: Party, d: SetupDraft): SetupEditChanges {
  const celebrants = cleanCelebrants(d);
  const c: Omit<SetupEditChanges, 'any'> = {
    date: d.date !== p.date,
    time: d.start !== p.start || d.end !== p.end,
    celebrants: !sameCelebrants(p.celebrants, celebrants),
    children: clampChildren(d.children, celebrants.length) !== p.children,
    place: d.place !== p.home.type,
  };
  return { ...c, any: Object.values(c).some(Boolean) };
}

/**
 * The changes that matter for the generated invitation text. The place only matters when no address is
 * typed (then the text says «hjemme hos oss» for a house or a flat); the children count is not in the text.
 */
function invitationChangesFor(p: Party, c: SetupEditChanges): InvitationChange[] {
  const placeMatters = c.place && !(p.invitation?.address ?? '').trim();
  const now: Record<InvitationChange, boolean> = {
    date: c.date,
    time: c.time,
    celebrants: c.celebrants,
    place: placeMatters,
  };
  return INVITATION_CHANGES.filter((k) => now[k]);
}

/**
 * Saves «Endre festen»: the draft's answers onto the same party. Throws on an incomplete draft (the screen
 * only saves a valid one). Nothing the parent picked or ticked is touched; see the file comment.
 */
export function withSetupEdit(p: Party, d: SetupDraft, today: ISODate): Party {
  if (!setupEditValid(d)) throw new Error('Setup edit is not complete');
  const c = setupEditChanges(p, d);
  if (!c.any) return p;
  const celebrants = cleanCelebrants(d);
  const date = d.date!;
  let next: Party = {
    ...p,
    celebrants,
    date,
    start: d.start!,
    end: d.end!,
    home: { ...p.home, type: d.place },
    // the one children number, the birthday children included; never below them plus one guest
    children: clampChildren(d.children, celebrants.length),
    // a new date re-plans the to-dos from today (as withDate); the ticks stay, they are kept by id
    plannedFrom: c.date ? today : p.plannedFrom,
  };
  // her own svarfrist moves along with the party (a week before stays a week before); one that no longer
  // fits (on or after the party, or already gone) goes back to the default: the day before
  const rsvpBy = p.invitation?.rsvpBy;
  if (c.date && rsvpBy && next.invitation) {
    const moved = addDays(rsvpBy, diffDays(p.date, date));
    const invitation = { ...next.invitation };
    if (moved < date && moved >= today) invitation.rsvpBy = moved;
    else delete invitation.rsvpBy;
    next = { ...next, invitation };
  }
  // her own invitation text is never overwritten: remember what changed so Invitasjon can offer a new text
  if (typeof p.invitation?.customText === 'string') {
    const changed = invitationChangesFor(p, c);
    if (changed.length) {
      const all = new Set([...(p.invitationChanges ?? []), ...changed]);
      next = { ...next, invitationChanges: INVITATION_CHANGES.filter((k) => all.has(k)) };
    }
  }
  return next;
}

/**
 * The hint on Invitasjon: the changes to point out, or null. Only while she has her own text (the
 * generated text always follows the party by itself).
 */
export function invitationChangeHint(p: Party): InvitationChange[] | null {
  if (typeof p.invitation?.customText !== 'string') return null;
  const list = (p.invitationChanges ?? []).filter((k) => INVITATION_CHANGES.includes(k));
  return list.length ? list : null;
}

/** «Behold teksten min», or her text was replaced/edited: nothing left to point out. */
export function withoutInvitationChanges(p: Party): Party {
  if (!p.invitationChanges) return p;
  const next = { ...p };
  delete next.invitationChanges;
  return next;
}

/** Defensive read of stored changes (older or hand-edited data): unknown words are dropped. */
export function sanitizeInvitationChanges(raw: unknown): InvitationChange[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = INVITATION_CHANGES.filter((k) => raw.includes(k));
  return list.length ? list : undefined;
}
