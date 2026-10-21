import { describe, expect, it } from 'vitest';
import { emma } from '../__fixtures__/emma';
import { balanceLines, invitationCard, inviteNameLayout } from '../texts/render';

describe('long names wrap, never truncate (invitation card)', () => {
  it('short names: one line, the big size', () => {
    expect(inviteNameLayout('Emma fyller 5')).toEqual({ text: 'Emma fyller 5', fontSize: 44, lines: 1 });
  });

  it('balanced lines at word boundaries; every word kept', () => {
    const full = 'Ingrid Alexandra og Matteo Federico fyller 5 og 7';
    const l = inviteNameLayout(full);
    expect(l.lines).toBe(3);
    expect(l.fontSize).toBeLessThan(44);
    expect(l.text.split('\n')).toEqual(['Ingrid Alexandra', 'og Matteo Federico', 'fyller 5 og 7']);
    expect(l.text.replace(/\n/g, ' ')).toBe(full);
    expect(l.text).not.toContain('…');
    expect(balanceLines('Gustav og Pia Helene fyller 6', 2)).toBe('Gustav og Pia\nHelene fyller 6');
    expect(balanceLines('Emma', 3)).toBe('Emma');
  });

  it('the invitation card text has the full names', () => {
    const p = emma({
      celebrants: [
        { id: 'c1', name: 'Ingrid Alexandra', age: 5 },
        { id: 'c2', name: 'Matteo Federico', age: 7 },
      ],
    });
    const c = invitationCard(p);
    expect(`${c.name} ${c.line}`).toContain('Ingrid Alexandra og Matteo Federico');
  });
});
