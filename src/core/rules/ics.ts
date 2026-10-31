/**
 * «Legg i kalenderen» (Oct 2026): a small iCalendar file (RFC 5545) for the party and for the svarfrist.
 * Deterministic: the same party gives the same bytes (the UID comes from the party id, the stamp from
 * when the party was last saved). No backend: the web downloads it, a phone opens it in its calendar.
 *
 * The party is written in floating local time (no time zone): «12.00» stays 12.00 on the phone it is
 * opened on, which is what a parent in Norway expects. The svarfrist is an all-day event.
 */
import type { ISODate, Party } from '../model';
import { t } from '../../i18n/i18n';
import { genitive } from '../texts/render';
import { addDays } from './dates';
import { celebrantNames } from './celebrants';
import { resolveInvitation } from './invitation';

export type IcsKind = 'party' | 'rsvp';

/** Escapes a TEXT value: backslash, semicolon, comma and line breaks (RFC 5545 §3.3.11). */
export function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Folds a content line at 75 octets (UTF-8), never inside a character (RFC 5545 §3.1). */
export function icsFold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with one space
    if (bytes + n > limit) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const compactDate = (d: ISODate) => d.replace(/-/g, '');
const compactTime = (hhmm: string) => `${hhmm.replace(':', '')}00`;

/** 2026-10-19T08:00:00.000Z → 20261019T080000Z; anything unreadable falls back to the planning day. */
function stamp(p: Pick<Party, 'updatedAt' | 'plannedFrom'>): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(p.updatedAt ?? '');
  if (m) return `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6]}Z`;
  return `${compactDate(p.plannedFrom)}T000000Z`;
}

/** The file for the party or the svarfrist, CRLF line endings. */
export function buildIcs(p: Party, kind: IcsKind, today?: ISODate): string {
  const s = resolveInvitation(p, today);
  const gen = genitive(celebrantNames(p.celebrants));
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//bursdagsklar//NONSGML v1//NB',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${p.id}-${kind}@bursdagsklar`,
    `DTSTAMP:${stamp(p)}`,
  ];
  if (kind === 'party') {
    // a party that ends before it starts (after midnight) would be odd; the setup never allows it
    lines.push(`DTSTART:${compactDate(p.date)}T${compactTime(p.start)}`);
    lines.push(`DTEND:${compactDate(p.date)}T${compactTime(p.end)}`);
    lines.push(`SUMMARY:${icsEscape(t('reminders.calendar.partyTitle', { gen }))}`);
    if (s.address) lines.push(`LOCATION:${icsEscape(s.address)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(s.rsvpBy)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(addDays(s.rsvpBy, 1))}`);
    lines.push(`SUMMARY:${icsEscape(t('reminders.calendar.rsvpTitle', { gen }))}`);
    lines.push(`DESCRIPTION:${icsEscape(t('reminders.calendar.rsvpDescription'))}`);
    lines.push('TRANSP:TRANSPARENT');
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(icsFold).join('\r\n') + '\r\n';
}

/** «emma-bursdag.ics» / «emma-svarfrist.ics»: plain ASCII, so every browser keeps the name. */
export function icsFileName(p: Pick<Party, 'celebrants'>, kind: IcsKind): string {
  const base =
    p.celebrants
      .map((c) => c.name)
      .join('-')
      .toLowerCase()
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'o')
      .replace(/å/g, 'a')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'bursdag';
  return `${base}-${kind === 'party' ? 'bursdag' : 'svarfrist'}.ics`;
}
