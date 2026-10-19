import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { FontDisplay, useFonts, type FontSource } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import { PartyProvider, useParty } from '../state/PartyProvider';
import { ToastProvider } from '../ui';
import { ThemeProvider, useColors } from '../theme';

// Native: keep the splash up until the fonts are in (expo-font is reliable there).
// Web: never hold the first render on fonts. Safari/WebKit can leave the
// document.fonts.load() promise expo-font awaits pending for its whole 12 s timeout,
// and returning null until then left the page blank. Text renders at once in the
// system-font fallback (see theme/tokens.ts) and swaps to the brand fonts on arrival.
const WAIT_FOR_FONTS = Platform.OS !== 'web';

if (WAIT_FOR_FONTS) SplashScreen.preventAutoHideAsync().catch(() => {});

// font-display: swap on web, so text is never invisible while a font downloads.
const swap = (uri: number): FontSource => ({ uri, display: FontDisplay.SWAP });
const FONTS = {
  BricolageGrotesque_600SemiBold: swap(BricolageGrotesque_600SemiBold),
  BricolageGrotesque_700Bold: swap(BricolageGrotesque_700Bold),
  BricolageGrotesque_800ExtraBold: swap(BricolageGrotesque_800ExtraBold),
  Figtree_400Regular: swap(Figtree_400Regular),
  Figtree_500Medium: swap(Figtree_500Medium),
  Figtree_600SemiBold: swap(Figtree_600SemiBold),
  Figtree_700Bold: swap(Figtree_700Bold),
};

export default function RootLayout() {
  const [loaded, error] = useFonts(FONTS);

  const fontsSettled = loaded || !!error;

  useEffect(() => {
    if (WAIT_FOR_FONTS && fontsSettled) SplashScreen.hideAsync().catch(() => {});
  }, [fontsSettled]);

  if (WAIT_FOR_FONTS && !fontsSettled) return null;

  return (
    <SafeAreaProvider>
      <PartyProvider>
        <PartyTheme>
          <ToastProvider>
            <StatusBar style="dark" />
            <ThemedStack />
          </ToastProvider>
        </PartyTheme>
      </PartyProvider>
    </SafeAreaProvider>
  );
}

/** The chosen theme (saved party, or the one picked during setup) paints the whole app; brand look before that. */
function PartyTheme({ children }: { children: React.ReactNode }) {
  const { party, draft } = useParty();
  return <ThemeProvider themeId={party?.theme ?? draft.theme ?? null}>{children}</ThemeProvider>;
}

function ThemedStack() {
  const colors = useColors();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }} />
  );
}
