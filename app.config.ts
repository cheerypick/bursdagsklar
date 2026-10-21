import type { ExpoConfig } from 'expo/config';

/**
 * One config for iOS, Android and web.
 * EXPO_BASE_URL sets where the web build lives: "/bursdagsklar" on GitHub Pages
 * (https://cheerypick.github.io/bursdagsklar/), empty for a site at the domain root.
 */
const baseUrl = process.env.EXPO_BASE_URL ?? '';

const config: ExpoConfig = {
  name: 'Bursdagsklar',
  slug: 'bursdagsklar',
  scheme: 'bursdagsklar',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  backgroundColor: '#FBF7F1',
  ios: {
    // Placeholder: confirm before the first App Store build.
    bundleIdentifier: 'no.bursdagsklar.app',
    supportsTablet: true,
    config: { usesNonExemptEncryption: false },
  },
  android: {
    // Placeholder: confirm before the first Play Store build.
    package: 'no.bursdagsklar.app',
    adaptiveIcon: {
      backgroundColor: '#FBF7F1',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    // One index.html for every route (GitHub Pages has no SPA fallback, so the
    // export step also copies it to 404.html; see scripts/postexport.mjs).
    output: 'single',
    bundler: 'metro',
    favicon: './assets/favicon.png',
    name: 'Bursdagsklar',
    shortName: 'Bursdagsklar',
    lang: 'nb',
    themeColor: '#FBF7F1',
    backgroundColor: '#FBF7F1',
    description: 'Planlegg barnebursdagen hjemme på under ett minutt. Ingen innlogging.',
  },
  plugins: [
    'expo-router',
    'expo-font',
    ['expo-splash-screen', { backgroundColor: '#FBF7F1', image: './assets/splash-icon.png', imageWidth: 160 }],
  ],
  experiments: {
    baseUrl,
    typedRoutes: false,
  },
  extra: {
    // Filled in by `eas init` (see docs/RELEASE.md).
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
};

export default config;
