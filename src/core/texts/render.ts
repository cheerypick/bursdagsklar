/**
 * Template renderer (TypeScript port of templates-render.mjs). No AI, no network:
 * `{slot}` is replaced, `{#flag}…{/flag}` is kept when the flag is truthy and
 * `{^flag}…{/flag}` when it is falsy; then spaces and empty lines are tidied.
 */
import templates from './templates.json';
import type { Party } from '../model';
import { formatLong, formatRangeCompact, formatDayMonth, capitalize } from '../rules/dates';
import { buildTasks } from '../rules/todos';
import { THEMES, themeById } from '../themes';
import { agesText, celebrantNames } from '../rules/celebrants';

export type Ctx = Record<string, string | number | boolean | undefined | null>;

export class MissingSlotError extends Error {}

export function render(tpl: string, ctx: Ctx, depth = 0): string {
  let out = tpl;
  for (let i = 0; i < 5; i++) {
    out = out.replace(/\{([#^])([a-z_]+)\}([\s\S]*?)\{\/\2\}/g, (_m, kind: string, flag: string, body: string) => {
      const on = Boolean(ctx[flag]);
      return (kind === '#' ? on : !on) ? body : '';
    });
  }
  out = out.replace(/\{([a-z_]+)\}/g, (_m, name: string) => {
    const v = ctx[name];
    if (v === undefined || v === null) throw new MissingSlotError(`missing slot {${name}}`);
    return String(v);
  });
  if (depth < 3 && /\{[#^]?[a-z_]+\}/.test(out)) out = render(out, ctx, depth + 1);
  return out
    .split('\n')
    .map((l) =>
      l
        .replace(/ {2,}/g, ' ')
        .replace(/ ([.,!?])/g, '$1')
        .trim(),
    )
    .filter((l) => l.length > 0)
    .join('\n');
}

export const TEMPLATES = templates;

type ThemeTexts = {
  navn: string;
  fest: string;
  emoji: string;
  fargelegging: string;
  apning: { sma: string; store: string };
  leken: string;
};

/** Texts for parties without a (known) theme. */
const NO_THEME: ThemeTexts = {
  navn: 'Bursdag',
  fest: 'bursdagsfest',
  emoji: '🎈',
  fargelegging: 'ballonger og kaker',
  apning: { sma: 'Du er invitert i bursdag!', store: 'Bli med i bursdag!' },
  leken: 'Hipp hipp hurra! Det blir bursdagsfest, og du er invitert.',
};

/** The template slots for a theme, read from the single theme list in core/themes.ts. */
export function themeTexts(id: string | null | undefined): ThemeTexts {
  const t = id ? THEMES.find((x) => x.id === id) : undefined;
  if (!t) return NO_THEME;
  return {
    navn: t.name,
    fest: t.fest,
    emoji: t.emoji,
    fargelegging: t.copy.colouring,
    apning: { sma: t.copy.opening.small, store: t.copy.opening.big },
    leken: t.copy.playful,
  };
}

/** The genitive used in headings: «Emmas», «Hans'». Only for ONE name; see `partyTitle` for joint parties. */
/**
 * Splits a long name line into `lines` lines at the spaces nearest to equal lengths (a balanced break),
 * so «Ingrid Alexandra og Matteo Federico fyller 5 og 7» reads in even lines instead of one long line and
 * a short tail. Deterministic, the same on web and native (CSS `text-wrap: balance` is web-only).
 * A line that still does not fit the width wraps on its own; nothing is ever cut off.
 */
export function balanceLines(text: string, lines: number): string {
  const words = text.trim().split(/\s+/);
  if (lines <= 1 || words.length < 2) return words.join(' ');
  const n = Math.min(lines, words.length);
  const out: string[] = [];
  let i = 0;
  for (let k = 1; k < n; k++) {
    // take words while the line is closer to its share of what is left
    const left = words.slice(i).join(' ').length;
    const target = left / (n - k + 1);
    let line = words[i++];
    while (
      i < words.length - (n - k) &&
      Math.abs(line.length + 1 + words[i].length - target) < Math.abs(line.length - target)
    )
      line += ` ${words[i++]}`;
    out.push(line);
  }
  out.push(words.slice(i).join(' '));
  return out.join('\n');
}

/**
 * The big name line on the invitation card: how many balanced lines and which font size (for the full
 * card; the compact card scales it). Long names step down in size AND wrap; they are never truncated.
 * ≤ 14 characters: one line at 44 · ≤ 22: one line at 38 · ≤ 34: two lines at 34 · ≤ 48: three lines
 * at 30 · longer: three lines at 26.
 */
export function inviteNameLayout(text: string): { text: string; fontSize: number; lines: number } {
  const len = text.trim().length;
  const [lines, fontSize] =
    len <= 14 ? [1, 44] : len <= 22 ? [1, 38] : len <= 34 ? [2, 34] : len <= 48 ? [3, 30] : [3, 26];
  return { text: balanceLines(text, lines), fontSize, lines };
}

export function genitive(name: string): string {
  return /[sxz]$/i.test(name) ? `${name}'` : `${name}s`;
}

/** The invitation card preview on «Festen er klar» (milestone 1: no address or contact yet). */
export function invitationCard(p: Party): { headline: string; name: string; line: string; when: string; rsvp: string } {
  const card = templates.texts.invitation.card;
  const theme = themeTexts(p.theme);
  const { rsvpDeadline } = buildTasks(p);
  const ctx: Ctx = {
    tema_fest: theme.fest,
    barn: celebrantNames(p.celebrants),
    alder: agesText(p.celebrants.map((c) => c.age)),
    flere: p.celebrants.length > 1,
    dato: capitalize(formatLong(p.date)),
    tid: formatRangeCompact(p.start, p.end),
  };
  return {
    // a chosen theme has its own headline; without one the neutral template line is used
    headline:
      p.theme && THEMES.some((t) => t.id === p.theme)
        ? themeById(p.theme).copy.inviteHeadline
        : render(card.overskrift, ctx),
    name: render(card.navn, ctx),
    line: render(card.linje, ctx),
    when: render(card.naar, ctx),
    rsvp: `Svar innen ${formatDayMonth(rsvpDeadline)}`,
  };
}
