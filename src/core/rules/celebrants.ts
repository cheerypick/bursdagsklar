/**
 * Joint birthdays (siblings, or 2–3 kindergarten friends): one party, 1–3 birthday children.
 * Names and ages are joined the Norwegian way, and the age rules pick a safe end of the range:
 * portions follow the OLDEST (feeds the most), the time reason and the cake follow the YOUNGEST.
 */
import type { Celebrant } from '../model';
import { MAX_AGE, MIN_AGE } from '../model';
import { joinList, t } from '../../i18n/i18n';

/** The age choices in setup: 3, 4 … 10. */
export const AGES: number[] = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i);

/** «Emma», «Emma og Jonas», «Emma, Jonas og Ali» (en: «Emma, Jonas and Ali»). */
export function joinNames(names: string[]): string {
  return joinList(names.map((x) => x.trim()).filter(Boolean));
}

/** Distinct ages, youngest first, as text: «5», «5 og 7», «4, 5 og 7». The same age is said once. */
export function agesText(ages: number[]): string {
  const uniq = [...new Set(ages)].sort((a, b) => a - b);
  return joinNames(uniq.map(String));
}

/** «fyller 5», «fyller 5 og 7» (en: «turning 5 and 7»). */
export function agePhrase(ages: number[]): string {
  return t('common.turning', { ages: agesText(ages) });
}

export function celebrantNames(cs: Pick<Celebrant, 'name'>[]): string {
  return joinNames(cs.map((c) => c.name));
}

export function youngestAge(cs: Pick<Celebrant, 'age'>[]): number {
  return cs.length ? Math.min(...cs.map((c) => c.age)) : 5;
}

export function oldestAge(cs: Pick<Celebrant, 'age'>[]): number {
  return cs.length ? Math.max(...cs.map((c) => c.age)) : 5;
}

/** An age inside 3–10 (older saved parties could hold 1, 2, 11 or 12). */
export function clampAge(age: number): number {
  return Math.min(MAX_AGE, Math.max(MIN_AGE, Math.round(age)));
}
