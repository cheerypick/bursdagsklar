import 'i18next';
import type { nb } from './nb';

/** Typed keys: `t('date.titel')` is a type error. nb.ts is the source of truth for the key set. */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof nb };
  }
}
