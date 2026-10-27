/**
 * The one i18next instance (spec §10). Plain i18next only, no React and no native modules, so the pure
 * rules in src/core can call `t()` too and the unit tests run it in Node.
 *
 * - nb (bokmål) is the default and the source of truth; en is the second language.
 * - Keys are namespaced by screen/feature inside one resource: `date.title`, `food.guests.forWhom`,
 *   `rules.time.weekdaySmall`, `themes.dino.name` …
 * - Plurals use i18next's plural rules (`key_one` / `key_other`, `count`); numbers are formatted with
 *   `formatNumber()` in the active locale (nb «1,5», en «1.5»).
 * - Deterministic: everything is written in advance, nothing is generated at runtime.
 *
 * The UI side (device language, the stored choice, re-rendering) lives in ./index.ts.
 */
import { createInstance } from 'i18next';
import { nb } from './nb';
import { en } from './en';

export const LANGUAGES = ['nb', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'nb';

export const resources = {
  nb: { translation: nb },
  en: { translation: en },
} as const;

export const isLanguage = (x: unknown): x is Language => x === 'nb' || x === 'en';

export const i18n = createInstance();
void i18n.init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...LANGUAGES],
  // React escapes text itself; the rules return plain strings
  interpolation: { escapeValue: false },
  initAsync: false,
});

/** The active language: 'nb' or 'en'. */
export function language(): Language {
  return isLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE;
}

/** The BCP 47 locale for Intl (dates, numbers): nb-NO, or en-GB (day before month, 24-hour clock). */
export function locale(lng: Language = language()): string {
  return lng === 'en' ? 'en-GB' : 'nb-NO';
}

/** Translate with the shared instance. Typed keys come from nb.json (see ./types.d.ts). */
export const t = ((...args: unknown[]) =>
  (i18n.t as unknown as (...a: unknown[]) => string)(...args)) as unknown as typeof i18n.t;

const numberFormats = new Map<string, Intl.NumberFormat>();
/** «1,5» in nb and «1.5» in en; at most one decimal unless `digits` says otherwise. */
export function formatNumber(x: number, digits = 1): string {
  const key = `${locale()}|${digits}`;
  let f = numberFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale(), { maximumFractionDigits: digits });
    numberFormats.set(key, f);
  }
  return f.format(x);
}

/** «a, b og c» / «a, b and c»: a list joined in the active language (no Oxford comma in either). */
export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${t('common.and')} ${items[items.length - 1]}`;
}

/**
 * A record whose values are read in the active language each time (getters), for the few tables
 * screens index by id: `DIET_LABELS.vegetar` is «Vegetar» in nb and «Vegetarian» in en.
 */
export function liveRecord<K extends string>(ids: readonly K[], key: (id: K) => string): Readonly<Record<K, string>> {
  const out = {} as Record<K, string>;
  for (const id of ids)
    Object.defineProperty(out, id, {
      get: () => i18n.t(key(id) as never) as string,
      enumerable: true,
    });
  return out;
}

/** `t()` for a key built at runtime from ids (`rules.menu.tray.${id}`), when TypeScript cannot narrow it. */
export function tDynamic(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key as never, options as never) as unknown as string;
}
