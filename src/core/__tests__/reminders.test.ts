import { afterEach, describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import { i18n } from '../../i18n/i18n';
import { nb } from '../../i18n/nb';
import templates from '../texts/templates.json';
import type { Guest, Party } from '../model';
import {
  allergyWords,
  hostNames,
  partlyOutside,
  partyReminderText,
  REMINDER_SECTIONS,
  REMINDER_TONES,
  reminderRoute,
  rsvpReminders,
  rsvpWords,
  thanksText,
} from '../rules/reminders';

const guests: Guest[] = [
  { id: 'gjest-1', name: 'Ola', status: 'pending', note: 'Nøtter' },
  { id: 'gjest-2', name: 'Sara', status: 'yes', note: 'gluten' },
  { id: 'gjest-3', name: 'Ali', status: 'no', note: 'melk' },
  { id: 'gjest-4', name: 'Ingrid Alexandra Marie', status: 'pending' },
];
const full = (over: Partial<Party> = {}) =>
  emma({
    invitation: { address: 'Storgata 12, 0155 Oslo', phone: '90000000', parentsHelp: false, rsvpBy: '2026-10-31' },
    guests,
    ...over,
  });

afterEach(async () => {
  await i18n.changeLanguage('nb');
});

describe('Påminnelser: the templates', () => {
  it('nb reads the reminder templates straight from templates.json (one source)', () => {
    expect(nb.reminders.tpl.svar).toEqual(templates.texts.rsvpReminder.variants);
    expect(nb.reminders.tpl.fest).toEqual(templates.texts.partyReminder.variants);
    expect(nb.reminders.tpl.takk).toEqual(templates.texts.thankYou.variants);
  });

  for (const lng of ['nb', 'en'] as const)
    for (const tone of REMINDER_TONES)
      it(`${lng} ${tone}: every slot is filled, nothing is left in braces`, async () => {
        await i18n.changeLanguage(lng);
        const p = full();
        const texts = [
          ...rsvpReminders(p, tone, '2026-10-30').personal.map((x) => x.text),
          rsvpReminders(emma(), tone, '2026-10-30').general as string,
          partyReminderText(p, tone, '2026-11-05'),
          thanksText(p, tone, { gift: true, forgotten: true }),
          thanksText(p, tone),
        ];
        for (const text of texts) {
          expect(text).not.toMatch(/[{}]/);
          expect(text).not.toMatch(/ {2}| [.,!?]/);
          expect(text).toContain('Emma');
        }
        // the party reminder carries the time, the address and the phone from Invitasjon
        const fest = partyReminderText(p, tone, '2026-11-05');
        expect(fest).toContain('Storgata 12, 0155 Oslo');
        if (tone !== 'kort') expect(fest).toContain('900 00 000');
        expect(fest).toContain(lng === 'nb' ? '12–14' : '12:00–14:00');
      });
});

describe('Påminnelser: svarpåminnelse', () => {
  it('one personal «Kommer Ola?» per child still waiting, nobody else', () => {
    const r = rsvpReminders(full(), 'standard', '2026-10-30');
    expect(r.general).toBeNull();
    expect(r.personal.map((x) => x.guest.name)).toEqual(['Ola', 'Ingrid Alexandra Marie']);
    expect(r.personal[0].text).toBe(
      'Hei! Bare en liten påminnelse om Emmas bursdag lørdag 7. november kl. 12–14. Kommer Ola? Svarfristen er i morgen. Si gjerne fra om allergier også. Tusen takk!',
    );
    // the long name is there in full (the screen wraps it, never «…»)
    expect(r.personal[1].text).toContain('Kommer Ingrid Alexandra Marie?');
  });

  it('a general message without a list, and when everyone has answered', () => {
    const none = rsvpReminders(emma(), 'kort', '2026-11-05');
    expect(none.personal).toEqual([]);
    expect(none.why).toBe('noList');
    expect(none.general).toBe(
      'Hei! Kommer barnet deres i Emmas bursdag lørdag 7. november? Gi gjerne beskjed innen i morgen. Takk!',
    );
    const answered = rsvpReminders(full({ guests: guests.map((g) => ({ ...g, status: 'yes' as const })) }));
    expect(answered.why).toBe('allAnswered');
    expect(answered.general).toContain('barnet deres');
  });

  it('svarfrist in words: i dag, i morgen, otherwise the date (en: today / by tomorrow / by …)', async () => {
    expect(rsvpWords('2026-10-31', '2026-10-31')).toBe('i dag');
    expect(rsvpWords('2026-10-31', '2026-10-30')).toBe('i morgen');
    expect(rsvpWords('2026-10-31', '2026-10-20')).toBe('lørdag 31. oktober');
    await i18n.changeLanguage('en');
    expect(rsvpWords('2026-10-31', '2026-10-31')).toBe('today');
    expect(rsvpWords('2026-10-31', '2026-10-30')).toBe('by tomorrow');
    expect(rsvpWords('2026-10-31')).toBe('by Saturday 31 October');
    expect(rsvpReminders(full(), 'standard', '2026-10-30').personal[0].text).toBe(
      "Hi! Just a little reminder about Emma's birthday party on Saturday 7 November at 12:00–14:00. Is Ola coming? It would be lovely to hear by tomorrow. Do let us know about any allergies too. Thank you so much!",
    );
  });
});

describe('Påminnelser: før festen', () => {
  it('standard nb, with the notes from the guest list (without names) and pick-up', () => {
    expect(partyReminderText(full(), 'standard')).toBe(
      'Hei alle sammen! Vi gleder oss til Emmas bursdag på lørdag kl. 12–14 i Storgata 12, 0155 Oslo. Vi har notert det dere har sagt fra om (nøtter og gluten), og tar hensyn til det i maten. Henting kl. 14.\nRing oss på 900 00 000 hvis dere ikke finner fram. Hilsen Emmas foreldre',
    );
  });

  it('no address or phone yet: no dangling words, «hjemme hos oss» for a home party', () => {
    const p = emma({ invitation: { parentsHelp: true }, programme: { activities: ['stafett'] } });
    expect(partyReminderText(p, 'standard')).toBe(
      'Hei alle sammen! Vi gleder oss til Emmas bursdag på lørdag kl. 12–14 hjemme hos oss. Vi er ute en stund, så kle barna etter været.\nHilsen Emmas foreldre',
    );
    const venue = emma({ home: { type: 'lokale', garden: null }, invitation: { parentsHelp: true } });
    expect(partyReminderText(venue, 'formell')).toBe(
      'Hei, en påminnelse om Emmas bursdag lørdag 7. november kl. 12–14. Vennlig hilsen Emmas foreldre',
    );
  });

  it('«ute» only when part of the party is outside; allergies skip those who said no', () => {
    expect(partlyOutside(emma())).toBe(false); // skattejakt and piñata are indoor games
    expect(partlyOutside(emma({ programme: { activities: ['stafett'] } }))).toBe(true); // garden + relay
    expect(
      partlyOutside(emma({ home: { type: 'leilighet', garden: false }, programme: { activities: ['stafett'] } })),
    ).toBe(false);
    expect(partlyOutside(emma({ home: { type: 'ute', garden: null } }))).toBe(true);
    expect(allergyWords(full())).toBe('nøtter og gluten');
    expect(allergyWords(emma())).toBe('');
  });

  it('the hosts’ names are used when the invitation has them (field from the print design PR)', () => {
    const p = full({
      invitation: { address: 'Storgata 12', phone: '90000000', hostNames: ' Kari  og Per ' } as Party['invitation'],
    });
    expect(hostNames(p)).toBe('Kari og Per');
    expect(partyReminderText(p, 'kort')).toBe(
      'Påminnelse: Emmas bursdag på lørdag kl. 12–14 i Storgata 12. Vi gleder oss! Hilsen Kari og Per',
    );
    expect(thanksText(p, 'standard')).toMatch(/\nHilsen Emma, Kari og Per$/);
  });
});

describe('Påminnelser: takkemelding', () => {
  it('toggles: joint gift vs gifts, and the PS about things left behind', () => {
    const p = full();
    expect(thanksText(p, 'standard')).toBe(
      'Tusen takk for at dere kom i Emmas bursdag i går! Og takk for gavene, Emma ble så glad. Det var en skikkelig fin dag.\nHilsen Emma og familien',
    );
    const both = thanksText(p, 'standard', { gift: true, forgotten: true });
    expect(both).toContain('Og takk for den fine gaven, Emma ble så glad.');
    expect(both).toContain('PS: Noen har glemt igjen ting hos oss.');
    expect(thanksText(p, 'formell', { gift: true })).toContain('Takk også for den felles gaven.');
    expect(thanksText(p, 'formell')).not.toContain('felles gave');
    expect(thanksText(p, 'kort', { forgotten: true })).toContain('gjenglemte ting');
  });

  it('joint parties: «glade», and «Emma, Jonas og familien»', async () => {
    const j = emma({
      celebrants: [
        { id: 'c1', name: 'Emma', age: 5 },
        { id: 'c2', name: 'Jonas', age: 7 },
      ],
    });
    const text = thanksText(j, 'standard');
    expect(text).toContain('Emma og Jonas ble så glade.');
    expect(text).toMatch(/Hilsen Emma, Jonas og familien$/);
    await i18n.changeLanguage('en');
    const en = thanksText(j, 'standard', { gift: true });
    expect(en).toContain('Emma and Jonas were so happy.');
    expect(en).toMatch(/Love from Emma, Jonas and family$/);
  });
});

describe('Påminnelser: routes', () => {
  it('every section has its own link: /paminnelser?m=…', () => {
    expect(REMINDER_SECTIONS.map(reminderRoute)).toEqual([
      '/paminnelser?m=svar',
      '/paminnelser?m=fest',
      '/paminnelser?m=takk',
    ]);
  });
});
