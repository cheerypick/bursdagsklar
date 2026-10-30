import { afterEach, describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import {
  buildInvitation,
  cardReplyLine,
  defaultRsvpBy,
  formatPhone,
  helpingParents,
  parentsHelpDefault,
  rsvpBounds,
  sanitizeInvitation,
  withInvitation,
} from '../rules/invitation';
import { headCount } from '../rules/people';
import { foodCounts } from '../rules/menu';
import { migrate } from '../storage/PartyRepository';
import { invitationCard } from '../texts/render';
import type { Party } from '../model';
import { i18n } from '../../i18n/i18n';

const PARENTS_HELP = 'Vi blir glade om noen foreldre har lyst til å bli og hjelpe til.';

/** Emma without a theme (themes are optional): the neutral invitation. */
const plain = (o: Partial<Party> = {}) => emma({ theme: null, ...o });
const four = (o: Partial<Party> = {}) => plain({ celebrants: [{ id: 'c1', name: 'Emma', age: 4 }], ...o });
const joint = (o: Partial<Party> = {}) =>
  plain({
    celebrants: [
      { id: 'c1', name: 'Emma', age: 5 },
      { id: 'c2', name: 'Jonas', age: 7 },
    ],
    ...o,
  });

describe('Invitasjon: the generated text', () => {
  it('single child, no theme: neutral, warm, every fact from the party', () => {
    const inv = buildInvitation(plain({ invitation: { address: 'Bjerkeveien 12', phone: '90000000' } }));
    expect(inv.text).toBe(
      [
        'Du er invitert i bursdag! 🎈',
        'Emma fyller 5 år, og vi vil gjerne feire sammen med deg!',
        '',
        'Når: Lørdag 7. november kl. 12–14',
        'Hvor: Bjerkeveien 12',
        '',
        'Gi beskjed hvis dere ikke kommer, gjerne innen fredag 6. november.',
        'Send gjerne en melding til 900 00 000.',
        'Si gjerne fra om allergier.',
        '',
        'Vi gleder oss!',
        'Hilsen Emma',
      ].join('\n'),
    );
    expect(inv.edited).toBe(false);
    expect(inv.phoneMissing).toBe(false);
  });

  it('joint party of 2: «Emma og Jonas fyller 5 og 7 år», greeting from both', () => {
    const t = buildInvitation(joint()).text;
    expect(t).toContain('Emma og Jonas fyller 5 og 7 år, og vi vil gjerne feire sammen med deg!');
    expect(t).toContain('Hilsen Emma og Jonas');
  });

  it('with a theme: the theme’s own opening line; without: the neutral one', () => {
    const themed = buildInvitation(emma()).text;
    expect(themed.split('\n')[0]).toBe('Finn fram glitteret! Det blir enhjørningfest, og du er invitert.');
    const neutral = buildInvitation(plain()).text;
    expect(neutral.split('\n')[0]).toBe('Du er invitert i bursdag! 🎈');
    expect(neutral).not.toMatch(/enhjørning/i);
    // the youngest is 7 or older: a slightly more grown-up neutral opening
    const older = buildInvitation(plain({ celebrants: [{ id: 'c1', name: 'Ali', age: 8 }] })).text;
    expect(older.split('\n')[0]).toBe('Bli med i bursdag! 🎈');
  });

  it('parents help: on adds the friendly line, off removes it', () => {
    expect(buildInvitation(plain({ invitation: { parentsHelp: true } })).text).toContain(PARENTS_HELP);
    expect(buildInvitation(plain({ invitation: { parentsHelp: false } })).text).not.toContain(PARENTS_HELP);
  });

  it('parents help is pre-ticked when the youngest is 3–4, otherwise not', () => {
    expect(parentsHelpDefault(four())).toBe(true);
    expect(parentsHelpDefault(plain({ celebrants: [{ id: 'c1', name: 'Emma', age: 3 }] }))).toBe(true);
    expect(parentsHelpDefault(plain())).toBe(false);
    // joint 4 + 7: follows the youngest
    expect(
      parentsHelpDefault({
        celebrants: [
          { id: 'c1', name: 'A', age: 7 },
          { id: 'c2', name: 'B', age: 4 },
        ],
      }),
    ).toBe(true);
    expect(buildInvitation(four()).text).toContain('Vi blir glade om noen foreldre har lyst til å bli og hjelpe til.');
    expect(buildInvitation(plain()).text).not.toContain(PARENTS_HELP);
  });

  it('siblings: off by default; on adds «Søsken er velkomne – si gjerne fra hvor mange.»', () => {
    expect(buildInvitation(plain()).text).not.toContain('Søsken');
    expect(buildInvitation(plain({ invitation: { siblings: true } })).text).toContain(
      'Søsken er velkomne – si gjerne fra hvor mange.',
    );
  });

  it('reply mode: «hvis dere ikke kommer» by default, «om dere kommer» when switched', () => {
    expect(buildInvitation(plain()).text).toContain(
      'Gi beskjed hvis dere ikke kommer, gjerne innen fredag 6. november.',
    );
    const coming = buildInvitation(plain({ invitation: { replyMode: 'ifComing' } })).text;
    expect(coming).toContain('Gi beskjed om dere kommer, gjerne innen fredag 6. november.');
    expect(coming).not.toContain('ikke kommer');
    expect(cardReplyLine(plain())).toBe('Kan dere ikke komme? Si fra innen 6.\u00a0november');
    expect(cardReplyLine(plain({ invitation: { replyMode: 'ifComing' } }))).toBe('Svar innen 6.\u00a0november');
  });

  it('svarfrist: the day before the party by default; an own date wins', () => {
    expect(defaultRsvpBy(plain())).toBe('2026-11-06');
    expect(buildInvitation(plain()).settings.rsvpBy).toBe('2026-11-06');
    expect(buildInvitation(plain({ invitation: { rsvpBy: '2026-11-01' } })).text).toContain(
      'gjerne innen søndag 1. november',
    );
    // party tomorrow: today; party today: the party day (never in the past)
    expect(defaultRsvpBy({ date: '2026-11-07' }, '2026-11-06')).toBe('2026-11-06');
    expect(defaultRsvpBy({ date: '2026-11-07' }, '2026-11-07')).toBe('2026-11-07');
    expect(rsvpBounds({ date: '2026-11-07' }, '2026-10-21')).toEqual({ min: '2026-10-21', max: '2026-11-06' });
  });

  it('phone empty → the soft reminder flag (never blocking); phone formatted the Norwegian way', () => {
    const none = buildInvitation(plain());
    expect(none.phoneMissing).toBe(true);
    expect(none.text).not.toContain('melding til');
    expect(buildInvitation(plain({ invitation: { phone: '  ' } })).phoneMissing).toBe(true);
    expect(formatPhone('90000000')).toBe('900 00 000');
    expect(formatPhone('+47 412 34 567')).toBe('412 34 567');
    expect(formatPhone('22334455')).toBe('22 33 44 55');
    expect(formatPhone('+46 70 123 45 67')).toBe('+46 70 123 45 67');
  });

  it('place: the typed address; empty at home → «hjemme hos oss»; empty elsewhere → no line', () => {
    expect(buildInvitation(plain()).text).toContain('Hvor: hjemme hos oss');
    expect(buildInvitation(plain({ home: { type: 'lokale', garden: null } })).text).not.toContain('Hvor:');
    expect(invitationCard(plain({ invitation: { address: 'Grendehuset' } })).where).toBe('Grendehuset');
  });

  it('wording rules: soft, nothing categorical, no «juice», no slots left', () => {
    const all = buildInvitation(
      joint({ invitation: { parentsHelp: true, siblings: true, phone: '90000000', address: 'Bjerkeveien 12' } }),
    ).text;
    expect(all).not.toMatch(/juice|\{|\}|må |skal /i);
    expect(all).toMatch(/gjerne/);
  });

  it('own edit: shown and shared instead; clearing it (Lag teksten på nytt) brings the generated text back', () => {
    const p = withInvitation(plain(), { customText: 'Vår egen tekst' });
    const inv = buildInvitation(p);
    expect(inv.text).toBe('Vår egen tekst');
    expect(inv.edited).toBe(true);
    expect(inv.generated).toContain('Emma fyller 5 år');
    const reset = buildInvitation(withInvitation(p, { customText: undefined }));
    expect(reset.edited).toBe(false);
    expect(reset.text).toBe(reset.generated);
    expect('customText' in (withInvitation(p, { customText: undefined }).invitation ?? {})).toBe(false);
  });

  it('is deterministic', () => {
    expect(buildInvitation(joint()).text).toBe(buildInvitation(joint()).text);
  });
});

describe('Invitasjon: helping parents in the food', () => {
  it('1 per 4 guest children, rounded up; the total already includes the birthday child (no double count)', () => {
    // 13 children in total = Emma + 12 guests → 3 helping parents
    expect(helpingParents(four({ children: 13 }))).toBe(3);
    // joint party: 13 in total = 2 birthday children + 11 guests → 3
    expect(helpingParents(joint({ children: 13, invitation: { parentsHelp: true } }))).toBe(3);
    expect(helpingParents(four({ children: 6 }))).toBe(2); // 5 guests
    expect(helpingParents(four({ children: 13, invitation: { parentsHelp: false } }))).toBe(0);
    expect(helpingParents(plain())).toBe(0); // 5 years: unticked by default
  });

  it('counted in the adults eating when ticked (the larger of helpers and the usual estimate, never both)', () => {
    // 5-year-old, unticked: 2 hosts + ceil(12 × 0.15) = 4 (unchanged)
    expect(headCount(plain()).adultsEating).toBe(4);
    // ticked: 2 hosts + max(2, 3 helpers) = 5
    expect(headCount(plain({ invitation: { parentsHelp: true } })).adultsEating).toBe(5);
    // 4-year-old (pre-ticked): 5; unticked: 4
    expect(headCount(four()).adultsEating).toBe(5);
    expect(headCount(four({ invitation: { parentsHelp: false } })).adultsEating).toBe(4);
    // 3-year-olds already expect half the parents to stay (6): the helpers (3) are inside that
    const three = plain({ celebrants: [{ id: 'c1', name: 'Emma', age: 3 }] });
    expect(headCount(three).adultsEating).toBe(8);
    // the food reads the same number
    expect(foodCounts(four()).adults).toBe(5);
  });
});

describe('Invitasjon: stored data', () => {
  it('a party saved without invitation opens as before (no field added)', () => {
    const p = migrate(plain());
    expect(p).not.toBeNull();
    expect('invitation' in (p as Party)).toBe(false);
  });

  it('a stored invitation survives; wrong types are dropped', () => {
    const p = migrate({
      ...plain(),
      invitation: { address: 'Bjerkeveien 12', phone: 900, siblings: true, replyMode: 'maybe', rsvpBy: 'snart' },
    });
    expect(p?.invitation).toEqual({ address: 'Bjerkeveien 12', siblings: true });
    expect(sanitizeInvitation(null)).toBeUndefined();
  });
});

describe('Invitation in English (same rules, the English text)', () => {
  afterEach(() => void i18n.changeLanguage('nb'));
  const en = () => void i18n.changeLanguage('en');

  it('single child: natural English, every fact from the party, English date and time', () => {
    en();
    const inv = buildInvitation(plain({ invitation: { address: '12 Birch Road', phone: '90000000' } }));
    expect(inv.text).toBe(
      [
        "You're invited to a birthday party! 🎈",
        "Emma is turning 5, and we'd love to celebrate with you!",
        '',
        'When: Saturday 7 November, 12:00–14:00',
        'Where: 12 Birch Road',
        '',
        "Let us know if you can't come, ideally by Friday 6 November.",
        'Feel free to send a message to 900 00 000.',
        'Please let us know about any allergies.',
        '',
        "We're looking forward to it!",
        'Love, Emma',
      ].join('\n'),
    );
  });

  it('joint party: «Emma and Jonas are turning 5 and 7»; parents help, siblings and reply mode', () => {
    en();
    const t = buildInvitation(joint({ invitation: { parentsHelp: true, siblings: true, replyMode: 'ifComing' } })).text;
    expect(t).toContain("Emma and Jonas are turning 5 and 7, and we'd love to celebrate with you!");
    expect(t).toContain("We'd be glad if a few parents would like to stay and help out.");
    expect(t).toContain('Siblings are welcome – just let us know how many.');
    expect(t).toContain("Let us know if you're coming, ideally by Friday 6 November.");
    expect(t).toContain('Where: at our place');
    expect(t).toContain('Love, Emma and Jonas');
    expect(t).not.toMatch(/[æøå]|\{|\}/i);
  });

  it('a theme gives its English opening; the card reply line follows the reply mode', () => {
    en();
    expect(buildInvitation(emma()).text.split('\n')[0]).not.toMatch(/[æøå]/i);
    expect(buildInvitation(plain({ celebrants: [{ id: 'c1', name: 'Ali', age: 8 }] })).text.split('\n')[0]).toBe(
      'Come to a birthday party! 🎈',
    );
    expect(cardReplyLine(plain())).toBe("Can't come? Let us know by 6\u00a0November");
    expect(cardReplyLine(plain({ invitation: { replyMode: 'ifComing' } }))).toBe('Please reply by 6\u00a0November');
  });

  it('switching back gives the Norwegian text again (nothing is stored in a language)', () => {
    en();
    const english = buildInvitation(plain()).text;
    void i18n.changeLanguage('nb');
    expect(buildInvitation(plain()).text).not.toBe(english);
    expect(buildInvitation(plain()).text).toContain('Emma fyller 5 år');
  });
});

describe("Invitasjon: the parents' names («Navn på foreldrene», optional)", () => {
  afterEach(() => void i18n.changeLanguage('nb'));
  it('stored trimmed-on-read and capped; old parties without it are fine', () => {
    const p = withInvitation(plain(), { hostNames: 'x'.repeat(200) });
    expect(p.invitation?.hostNames).toHaveLength(60);
    expect(sanitizeInvitation({ hostNames: 'Kari og Per', phone: 1 })).toEqual({ hostNames: 'Kari og Per' });
    expect(sanitizeInvitation({ hostNames: 42 })).toEqual({});
    // a party saved before the field: the text is exactly as before
    expect(buildInvitation(plain({ invitation: { phone: '90000000' } })).text).toContain(
      'Send gjerne en melding til 900 00 000.',
    );
  });

  it('used in the text where natural: «Send gjerne en melding til Kari og Per på 900 00 000.»', () => {
    const inv = buildInvitation(plain({ invitation: { phone: '90000000', hostNames: ' Kari og Per ' } }));
    expect(inv.text).toContain('Send gjerne en melding til Kari og Per på 900 00 000.');
    expect(inv.settings.hostNames).toBe('Kari og Per');
    // without a phone number the names are only on the printed card
    expect(buildInvitation(plain({ invitation: { hostNames: 'Kari og Per' } })).text).not.toContain('Kari');
    void i18n.changeLanguage('en');
    expect(buildInvitation(plain({ invitation: { phone: '90000000', hostNames: 'Kari and Per' } })).text).toContain(
      'Feel free to send Kari and Per a message on 900 00 000.',
    );
  });
});
