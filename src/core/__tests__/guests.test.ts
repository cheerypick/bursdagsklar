import { afterEach, describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import { i18n } from '../../i18n/i18n';
import type { Party } from '../model';
import {
  GUEST_NAME_MAX,
  GUEST_NOTE_MAX,
  guestCardLine,
  guestCounts,
  guestHint,
  guestHintText,
  guestNotes,
  guestNotesSummary,
  inviteeGuests,
  MAX_GUESTS,
  personalInvitation,
  sanitizeGuests,
  withChildrenFromGuests,
  withGuestAdded,
  withGuestName,
  withGuestNote,
  withGuestRemoved,
  withGuestStatus,
} from '../rules/guests';
import { headCount } from '../rules/people';
import { shoppingList } from '../rules/food';
import { buildTasks } from '../rules/todos';
import { createPartyRepository, memoryStore, migrate } from '../storage/PartyRepository';

/** Gjesteliste (Ekaterina, 30 Oct 2026): optional names, answers and notes; soft hints, never auto-changes. */
afterEach(() => void i18n.changeLanguage('nb'));

const withNames = (p: Party, ...names: string[]) => names.reduce((q, n) => withGuestAdded(q, n), p);
/** Emma (the birthday child) + 13 children in total in the plan. */
const three = () => withNames(emma(), 'Ola', 'Sara', 'Noah');

describe('add and remove', () => {
  it('adds by name, «Venter på svar» by default, with stable ids', () => {
    const p = three();
    expect(p.guests).toEqual([
      { id: 'gjest-1', name: 'Ola', status: 'pending' },
      { id: 'gjest-2', name: 'Sara', status: 'pending' },
      { id: 'gjest-3', name: 'Noah', status: 'pending' },
    ]);
  });
  it('trims and squeezes spaces; a blank name changes nothing', () => {
    const p = withNames(emma(), '  Anna   Marie  ', '   ');
    expect(p.guests.map((g) => g.name)).toEqual(['Anna Marie']);
    expect(withGuestAdded(emma(), '')).toEqual(emma());
  });
  it('keeps long names whole up to the max (the screen wraps them, never «…»)', () => {
    const long = 'Maximilian Alexander Johannessen-Bergersen';
    const p = withGuestAdded(emma(), long);
    expect(p.guests[0].name).toBe(long.slice(0, GUEST_NAME_MAX));
  });
  it('removing one keeps the others, and a new id is never reused while a higher one exists', () => {
    const p = withGuestRemoved(three(), 'gjest-2');
    expect(p.guests.map((g) => g.name)).toEqual(['Ola', 'Noah']);
    expect(withGuestAdded(p, 'Ida').guests.at(-1)?.id).toBe('gjest-4');
  });
  it('stops at the most children a party can have', () => {
    let p = emma();
    for (let i = 0; i < MAX_GUESTS + 3; i++) p = withGuestAdded(p, `Barn ${i}`);
    expect(p.guests).toHaveLength(MAX_GUESTS);
  });
  it('rename keeps the old name when the new one is blank', () => {
    expect(withGuestName(three(), 'gjest-1', 'Ole').guests[0].name).toBe('Ole');
    expect(withGuestName(three(), 'gjest-1', '  ').guests[0].name).toBe('Ola');
  });
});

describe('answers and counts', () => {
  it('counts Kommer / Kommer ikke / Venter', () => {
    let p = withGuestStatus(three(), 'gjest-1', 'yes');
    p = withGuestStatus(p, 'gjest-2', 'no');
    expect(guestCounts(p)).toEqual({ names: 3, yes: 1, no: 1, pending: 1 });
    expect(guestCounts(withGuestStatus(p, 'gjest-2', 'pending'))).toEqual({ names: 3, yes: 1, no: 0, pending: 2 });
  });
  it('the Planen card: optional when empty, «3 navn · 1 kommer» when used (nb and en)', () => {
    expect(guestCardLine(emma())).toBe('Valgfritt: navn, svar og allergier');
    const p = withGuestStatus(three(), 'gjest-1', 'yes');
    expect(guestCardLine(p)).toBe('3 navn · 1 kommer');
    void i18n.changeLanguage('en');
    expect(guestCardLine(p)).toBe('3 names · 1 coming');
    expect(guestCardLine(withNames(emma(), 'Ola'))).toBe('1 name · 0 coming');
  });
});

describe('soft hints (the list never changes the plan on its own)', () => {
  it('no names → no hint', () => {
    expect(guestHint(emma())).toBeNull();
  });
  it('the birthday child is not on the list: 3 names + Emma = 4, the plan says 13', () => {
    const h = guestHint(three());
    expect(h).toMatchObject({ kind: 'differs', names: 3, suggested: 4, planned: 13, fewer: true, canApply: true });
    expect(guestHintText(h!)).toBe('3 navn på lista. Med Emma blir det 4 barn, planen regner med 13.');
  });
  it('12 names + Emma = 13 → the list and the plan match', () => {
    const p = withNames(emma(), ...Array.from({ length: 12 }, (_, i) => `Barn ${i + 1}`));
    const h = guestHint(p);
    expect(h).toMatchObject({ kind: 'same', suggested: 13, canApply: false });
    expect(guestHintText(h!)).toBe('Lista og planen stemmer: 13 barn med Emma.');
  });
  it('a joint party counts both birthday children', () => {
    const p = withNames(
      emma({
        celebrants: [
          { id: 'c1', name: 'Emma', age: 5 },
          { id: 'c2', name: 'Jonas', age: 7 },
        ],
        children: 6,
      }),
      'Ola',
      'Sara',
      'Noah',
      'Ida',
    );
    expect(guestHint(p)).toMatchObject({ kind: 'same', suggested: 6, celebrants: 'Emma og Jonas' });
  });
  it('«Kommer ikke» → a soft «maybe fewer» hint', () => {
    const p = withGuestStatus(
      withNames(emma(), ...Array.from({ length: 12 }, (_, i) => `Barn ${i + 1}`)),
      'gjest-3',
      'no',
    );
    const h = guestHint(p)!;
    expect(h).toMatchObject({ kind: 'declined', declined: 1, suggested: 12, planned: 13, canApply: true });
    expect(guestHintText(h)).toBe(
      '1 har svart at de ikke kommer. Da blir dere kanskje 12 barn med Emma, planen regner med 13.',
    );
    void i18n.changeLanguage('en');
    expect(guestHintText(h)).toBe("1 has said they can't come. So maybe 12 children with Emma, the plan counts 13.");
  });
  it('more names than the plan: the hint says so (not «fewer»)', () => {
    const p = withNames(emma({ children: 3 }), 'Ola', 'Sara', 'Noah');
    expect(guestHint(p)).toMatchObject({ kind: 'differs', suggested: 4, planned: 3, fewer: false });
  });
  it('nothing changes until she taps «Bruk N barn i planen»', () => {
    const p = withGuestStatus(three(), 'gjest-2', 'no');
    expect(p.children).toBe(13);
    expect(headCount(p).kidsComing).toBe(13);
    const used = withChildrenFromGuests(p);
    // Ola + Noah (Sara said no) + Emma
    expect(used.children).toBe(3);
    expect(headCount(used).kidsComing).toBe(3);
  });
  it('no button when the list says fewer than a party can have (Emma alone)', () => {
    const p = withGuestStatus(withNames(emma(), 'Ola'), 'gjest-1', 'no');
    expect(guestHint(p)).toMatchObject({ suggested: 1, canApply: false });
    expect(withChildrenFromGuests(p)).toBe(p);
  });
});

describe('allergy and diet notes', () => {
  it('a short free-text note per child; blank removes it', () => {
    let p = withGuestNote(three(), 'gjest-1', '  nøtter ');
    expect(p.guests[0]).toEqual({ id: 'gjest-1', name: 'Ola', status: 'pending', note: 'nøtter' });
    p = withGuestNote(p, 'gjest-1', ' ');
    expect(p.guests[0]).toEqual({ id: 'gjest-1', name: 'Ola', status: 'pending' });
    expect(withGuestNote(three(), 'gjest-1', 'x'.repeat(200)).guests[0].note).toHaveLength(GUEST_NOTE_MAX);
  });
  it('the summary for Mat: «Ola (nøtter), Sara (gluten)», leaving out those who said no', () => {
    let p = withGuestNote(three(), 'gjest-1', 'nøtter');
    p = withGuestNote(p, 'gjest-2', 'gluten');
    p = withGuestNote(p, 'gjest-3', 'melk');
    p = withGuestStatus(p, 'gjest-3', 'no');
    expect(guestNotes(p)).toEqual([
      { name: 'Ola', note: 'nøtter' },
      { name: 'Sara', note: 'gluten' },
    ]);
    expect(guestNotesSummary(p)).toBe('Ola (nøtter), Sara (gluten)');
    expect(guestNotesSummary(three())).toBe('');
  });
  it('notes never tick a diet chip or change the food or the shopping list', () => {
    const p = withGuestNote(withGuestNote(three(), 'gjest-1', 'glutenfri'), 'gjest-2', 'ikke svin');
    expect(p.diets).toEqual([]);
    expect(shoppingList(p)).toEqual(shoppingList(emma()));
  });
});

describe('feed-ins', () => {
  it('a personal invitation per child: «Hei Ola!» on top (nb) / «Hi Ola!» (en)', () => {
    expect(personalInvitation('Ola', 'Velkommen!')).toBe('Hei Ola!\n\nVelkommen!');
    void i18n.changeLanguage('en');
    expect(personalInvitation('Ola', 'Welcome!')).toBe('Hi Ola!\n\nWelcome!');
  });
  it('those who said no get no personal invitation', () => {
    const p = withGuestStatus(three(), 'gjest-2', 'no');
    expect(inviteeGuests(p).map((g) => g.name)).toEqual(['Ola', 'Noah']);
  });
  it('the «Lag gjestelisten» to-do links to the list and stays done on its own', () => {
    const task = buildTasks(emma()).tasks.find((x) => x.id === 'guestList');
    expect(task).toMatchObject({ auto: true, link: { route: '/gjesteliste' } });
  });
});

describe('old parties and storage (no schema bump)', () => {
  it('an old party with guests: [] opens with an empty list', () => {
    expect(migrate(emma())?.guests).toEqual([]);
  });
  it('a record with no guests field at all still opens', () => {
    const { guests: _g, ...old } = emma();
    expect(migrate(old)?.guests).toEqual([]);
  });
  it('the pre-list Guest shape (label, allergies, adultsStaying) is read as a name, junk is dropped', () => {
    const old = emma({
      guests: [
        { id: 'g1', label: 'Kari', status: 'yes', adultsStaying: 1, allergies: ['notter'] },
        { id: 'g1', name: 'Per', status: 'maybe' },
        { name: '   ' },
        42,
      ] as never,
    });
    expect(migrate(old)?.guests).toEqual([
      { id: 'g1', name: 'Kari', status: 'yes' },
      { id: 'gjest-1', name: 'Per', status: 'pending' },
    ]);
    expect(sanitizeGuests('nope')).toEqual([]);
  });
  it('names, answers and notes survive a save and a reload', async () => {
    const store = memoryStore();
    const repo = createPartyRepository(store);
    const p = withGuestNote(withGuestStatus(three(), 'gjest-1', 'yes'), 'gjest-2', 'gluten');
    await repo.save(p);
    const again = await createPartyRepository(store).get(p.id);
    expect(again?.guests).toEqual(p.guests);
  });
});

describe('words (nb and en)', () => {
  it('no store chain names and no «juice» in any guest-list text', () => {
    const texts = [guestCardLine(three()), guestHintText(guestHint(three())!)];
    for (const s of texts) expect(s).not.toMatch(/juice|rema|kiwi|meny|oda\b|spar\b|coop|joker|bunnpris/i);
  });
});
