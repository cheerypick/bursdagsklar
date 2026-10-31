import { describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import { buildIcs, icsEscape, icsFileName, icsFold } from '../rules/ics';

const enc = new TextEncoder();

describe('Legg i kalenderen (.ics)', () => {
  const p = emma({ invitation: { address: 'Storgata 12, 0155 Oslo', rsvpBy: '2026-10-31' } });

  it('the party: floating local time, the address as location, a stable UID', () => {
    const ics = buildIcs(p, 'party');
    expect(ics).toBe(
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//bursdagsklar//NONSGML v1//NB',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        'UID:7d0c3f5e-1c1a-4f6b-9a51-6a3c2b1e0e01-party@bursdagsklar',
        'DTSTAMP:20261019T080000Z',
        'DTSTART:20261107T120000',
        'DTEND:20261107T140000',
        'SUMMARY:Emmas bursdag',
        'LOCATION:Storgata 12\\, 0155 Oslo',
        'END:VEVENT',
        'END:VCALENDAR',
        '',
      ].join('\r\n'),
    );
    expect(buildIcs(p, 'party')).toBe(ics); // deterministic
  });

  it('the svarfrist: an all-day event on the invitation’s svarfrist', () => {
    const ics = buildIcs(p, 'rsvp');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261031\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20261101\r\n');
    expect(ics).toContain('SUMMARY:Svarfrist for Emmas bursdag\r\n');
    expect(ics).not.toContain('LOCATION');
  });

  it('lines are folded at 75 octets, never inside æøå, and text is escaped', () => {
    for (const line of buildIcs(p, 'rsvp').split('\r\n')) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
    const folded = icsFold(`SUMMARY:${'æøå'.repeat(40)}`);
    expect(folded.split('\r\n ').join('')).toBe(`SUMMARY:${'æøå'.repeat(40)}`);
    for (const l of folded.split('\r\n')) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
    expect(icsEscape('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });

  it('ASCII file names', () => {
    expect(icsFileName(emma({ celebrants: [{ id: 'c1', name: 'Bjørn Åge', age: 5 }] }), 'party')).toBe(
      'bjorn-age-bursdag.ics',
    );
    expect(icsFileName(p, 'rsvp')).toBe('emma-svarfrist.ics');
  });
});
