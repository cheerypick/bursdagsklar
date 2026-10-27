/**
 * The UI side of i18n: which language the app starts in, the user's choice, and re-rendering.
 *
 * - Start: the language stored on this device (same store as the parties, key `bursdagsklar:language`),
 *   else the device language when it is English, else Norwegian bokmål.
 * - Screens call `useTranslation()` from react-i18next; the instance is provided in app/_layout.tsx.
 * - The rules in src/core use the same instance through ./i18n.ts (no React there).
 */
import { useCallback, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import { LANGUAGE_KEY } from '../core/storage/PartyRepository';
import { DEFAULT_LANGUAGE, i18n, isLanguage, language, type Language } from './i18n';

export * from './i18n';

/** Where the choice is kept. Survives «Start på nytt»: it is a setting for the device, not part of a plan. */
export { LANGUAGE_KEY };

/** The minimal store API (AsyncStorage, which is localStorage on web). */
export interface LanguageStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** English devices start in English; every other device language starts in Norwegian bokmål. */
export function deviceLanguage(): Language {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    return code === 'en' ? 'en' : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function applyLanguage(lng: Language) {
  if (i18n.language !== lng) void i18n.changeLanguage(lng);
  if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.lang = lng;
}

/** Web: localStorage can be read at once, so a reload in English never flashes Norwegian first. */
function storedLanguageSync(): Language | null {
  if (Platform.OS !== 'web') return null;
  try {
    const v = globalThis.localStorage?.getItem(LANGUAGE_KEY);
    return isLanguage(v) ? v : null;
  } catch {
    return null;
  }
}

let store: LanguageStore | null = null;

/**
 * Called once at startup (before the first render): sets the language from the stored choice or the
 * device. Native reads AsyncStorage asynchronously and switches when the answer comes.
 */
export function initLanguage(s: LanguageStore) {
  store = s;
  applyLanguage(storedLanguageSync() ?? deviceLanguage());
  if (Platform.OS !== 'web') {
    s.getItem(LANGUAGE_KEY)
      .then((v) => {
        if (isLanguage(v)) applyLanguage(v);
      })
      .catch(() => {});
  }
}

/** The language picker: switches at once and remembers the choice on this device. */
export function setLanguage(lng: Language) {
  applyLanguage(lng);
  store?.setItem(LANGUAGE_KEY, lng).catch(() => {});
}

function subscribe(onChange: () => void) {
  i18n.on('languageChanged', onChange);
  return () => i18n.off('languageChanged', onChange);
}

/** The active language as React state: [language, setLanguage]. */
export function useLanguage(): [Language, (lng: Language) => void] {
  const lng = useSyncExternalStore(subscribe, language, language);
  return [lng, useCallback((x: Language) => setLanguage(x), [])];
}
