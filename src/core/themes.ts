import type { ThemeId } from './model';

/**
 * One theme = one entry in THEMES below. Everything that follows the theme reads it from here:
 * the colours the whole app is painted in, the invitation, the cake idea and the small texts.
 * Adding a theme: add its id to `ThemeId` (model.ts), add one entry here, and add its picture
 * to `themeImages` in src/theme/images.ts (TypeScript refuses to build until all three exist).
 * The unit tests then check that its palette is complete and readable (WCAG AA).
 */

/** The colours a theme paints the app in. Every text/background pair used on screen must reach 4.5:1. */
export interface ThemePalette {
  /** Buttons, selected states, progress, the active tab, the «Festen er klar» background. */
  primary: string;
  /** Primary button hover/pressed. */
  primaryHover: string;
  /** Text and icons on `primary`. */
  onPrimary: string;
  /** Secondary text on `primary` (the lede on «Festen er klar»). */
  onPrimarySoft: string;
  /** Accent text (eyebrows, links) on the background, on white cards and on `cardTint`. */
  accent: string;
  /** Page background tint. */
  bg: string;
  /** Highlighted cards: the next to-do and the Planen hero. */
  cardTint: string;
  /** Soft fills: chips, unselected pills, the progress ring track, arrow buttons. */
  soft: string;
  /** Background of the invitation card. */
  inviteTint: string;
  /** Headline colour on the invitation card. */
  inviteInk: string;
}

export interface Theme {
  id: ThemeId;
  /** Shown on the theme card and in the plan header. Licensed names appear as plain text only. */
  name: string;
  /**
   * True for themes named after a brand someone else owns (Pokémon, Paw Patrol, Frost).
   * Screens that show such a name also show `LICENSE_DISCLAIMER`.
   */
  licensed: boolean;
  /** Small motif used next to theme texts. An ordinary emoji: never character art. */
  emoji: string;
  /** «enhjørningfest» — used inside sentences. */
  fest: string;
  /** «Enhjørningkake» — the short cake name. */
  cake: string;
  /** «enhjørning-piñata» */
  pinata: string;
  /** Our own Norwegian lines (never quotes or catchphrases from shows or films). */
  copy: {
    /** One friendly line on the Planen hero. */
    greeting: string;
    /** Invitation card headline. */
    inviteHeadline: string;
    /** The cake suggestion in a few words. */
    cakeIdea: string;
    /** Colouring-page motif for the invitation templates. */
    colouring: string;
    /** Invitation openings for younger and older children. */
    opening: { small: string; big: string };
    /** The playful invitation text. */
    playful: string;
  };
  palette: ThemePalette;
}

/** Used before a theme is chosen: the app's own cream-and-green look. */
export const BRAND_PALETTE: ThemePalette = {
  primary: '#1F3D36',
  primaryHover: '#2C5348',
  onPrimary: '#FFFFFF',
  onPrimarySoft: '#CFE0D9',
  accent: '#2C5348',
  bg: '#FBF7F1',
  cardTint: '#F7E0DF',
  soft: '#E0EADD',
  inviteTint: '#F7E6EE',
  inviteInk: '#7A5A6D',
};

/** Shown wherever a licensed theme name appears, and in the footer. */
export const LICENSE_DISCLAIMER = 'Bursdagsklar er ikke tilknyttet Disney, Spin Master eller The Pokémon Company.';

/**
 * Pokémon, Paw Patrol and Frost are trademarks of their owners. We use the names only as words
 * («Pokémon-fest») with our own palette and mood illustrations: no characters, logos, official art
 * or brand fonts, and every line of copy is our own.
 */
export const THEMES: Theme[] = [
  {
    id: 'enhjorning',
    name: 'Enhjørninger',
    licensed: false,
    emoji: '🦄',
    fest: 'enhjørningfest',
    cake: 'Enhjørningkake',
    pinata: 'enhjørning-piñata',
    copy: {
      greeting: 'Glitter, regnbuer og masse moro venter!',
      inviteHeadline: 'Bli med på en magisk enhjørningfest!',
      cakeIdea: 'Rosa og hvit kake med regnbuedryss',
      colouring: 'enhjørninger',
      opening: { small: 'Du er invitert til enhjørningfest!', big: 'Bli med på enhjørningfest!' },
      playful: 'Finn fram glitteret! Det blir enhjørningfest, og du er invitert.',
    },
    palette: {
      primary: '#8A3672',
      primaryHover: '#73295E',
      onPrimary: '#FFFFFF',
      onPrimarySoft: '#F6DDEE',
      accent: '#7E3168',
      bg: '#FDF6FA',
      cardTint: '#F8E4F0',
      soft: '#F4E3EE',
      inviteTint: '#F7E6EE',
      inviteInk: '#7A3268',
    },
  },
  {
    id: 'dinosaurer',
    name: 'Dinosaurer',
    licensed: false,
    emoji: '🦖',
    fest: 'dinosaurfest',
    cake: 'Dinosaurkake',
    pinata: 'dinosaur-piñata',
    copy: {
      greeting: 'Klar for en brølende god fest?',
      inviteHeadline: 'Brøl! Det blir dinosaurfest!',
      cakeIdea: 'Grønn kake med sjokoladesteiner og dinoegg',
      colouring: 'dinosaurer',
      opening: { small: 'Du er invitert til dinosaurfest!', big: 'Bli med på dinosaurfest!' },
      playful: 'Roooar! Det blir dinosaurfest, og du er invitert.',
    },
    palette: {
      primary: '#2F5D34',
      primaryHover: '#244A29',
      onPrimary: '#FFFFFF',
      onPrimarySoft: '#D8E8D2',
      accent: '#355E33',
      bg: '#F7F9F1',
      cardTint: '#E6EED9',
      soft: '#E2ECD8',
      inviteTint: '#E3ECDD',
      inviteInk: '#3F5E3A',
    },
  },
  {
    id: 'verdensrommet',
    name: 'Verdensrommet',
    licensed: false,
    emoji: '🚀',
    fest: 'romfest',
    cake: 'Romkake',
    pinata: 'rakett-piñata',
    copy: {
      greeting: 'Nedtellingen er i gang: 3, 2, 1, fest!',
      inviteHeadline: 'Bli med på en fest ut av denne verden!',
      cakeIdea: 'Mørkeblå kake med stjernedryss og planeter',
      colouring: 'romskip og planeter',
      opening: { small: 'Du er invitert til romfest!', big: 'Bli med på romfest!' },
      playful: 'Gjør deg klar for avgang! Det blir romfest, og du er invitert.',
    },
    palette: {
      primary: '#2E3A73',
      primaryHover: '#232D5C',
      onPrimary: '#FFFFFF',
      onPrimarySoft: '#D9DEF4',
      accent: '#36437A',
      bg: '#F5F6FB',
      cardTint: '#E3E7F4',
      soft: '#E4E7F4',
      inviteTint: '#E2E6F2',
      inviteInk: '#3B4A74',
    },
  },
  {
    id: 'fotball',
    name: 'Fotball',
    licensed: false,
    emoji: '⚽',
    fest: 'fotballfest',
    cake: 'Fotballkake',
    pinata: 'fotball-piñata',
    copy: {
      greeting: 'Avspark for tidenes bursdag!',
      inviteHeadline: 'Bli med på fotballfest, alle er på laget!',
      cakeIdea: 'Grønn gressbanekake med en marsipanball',
      colouring: 'fotballspillere',
      opening: { small: 'Du er invitert til fotballfest!', big: 'Bli med på fotballfest!' },
      playful: 'Snør på deg fotballskoene! Det blir fotballfest, og du er tatt ut på laget.',
    },
    palette: {
      primary: '#22663A',
      primaryHover: '#1A522E',
      onPrimary: '#FFFFFF',
      onPrimarySoft: '#D3EBD9',
      accent: '#2A5E36',
      bg: '#F5FAF3',
      cardTint: '#E2EFDD',
      soft: '#DFEEDA',
      inviteTint: '#E3EEE0',
      inviteInk: '#2F5A37',
    },
  },
  {
    id: 'dyr-i-skogen',
    name: 'Dyr i skogen',
    licensed: false,
    emoji: '🦊',
    fest: 'skogsfest',
    cake: 'Skogskake',
    pinata: 'rev-piñata',
    copy: {
      greeting: 'Reven, haren og ugla gleder seg til fest!',
      inviteHeadline: 'Bli med på skogsfest blant trærne!',
      cakeIdea: 'Sjokoladekake med marsipansopp og kongler',
      colouring: 'skogsdyr',
      opening: { small: 'Du er invitert til skogsfest!', big: 'Bli med på skogsfest!' },
      playful: 'Reven, ekornet og haren har sendt bud: Det blir skogsfest, og du er invitert!',
    },
    palette: {
      primary: '#7A4A26',
      primaryHover: '#633B1D',
      onPrimary: '#FFFFFF',
      onPrimarySoft: '#F2E2D2',
      accent: '#76492A',
      bg: '#FBF6EF',
      cardTint: '#F2E7D8',
      soft: '#EFE4D3',
      inviteTint: '#F1E7DA',
      inviteInk: '#7A5232',
    },
  },
  {
    id: 'pokemon',
    name: 'Pokémon',
    licensed: true,
    emoji: '⚡',
    fest: 'Pokémon-fest',
    cake: 'Pokémon-kake',
    pinata: 'lyn-piñata',
    copy: {
      greeting: 'Gjør deg klar for en lynrask fest!',
      inviteHeadline: 'Bli med på Pokémon-fest med lynende moro!',
      cakeIdea: 'Gul kake med lyn av sjokolade',
      colouring: 'lyn og stjerner',
      opening: { small: 'Du er invitert til Pokémon-fest!', big: 'Bli med på Pokémon-fest!' },
      playful: 'Gjør deg klar for lynende moro! Det blir Pokémon-fest, og du er invitert.',
    },
    palette: {
      primary: '#B3261E',
      primaryHover: '#931E18',
      onPrimary: '#FFFFFF',
      onPrimarySoft: '#FFE3DC',
      accent: '#8E2A1C',
      bg: '#FFFBEB',
      cardTint: '#FCEFC2',
      soft: '#FDF0C4',
      inviteTint: '#FBEFC9',
      inviteInk: '#9A3A2A',
    },
  },
  {
    id: 'paw-patrol',
    name: 'Paw Patrol',
    licensed: true,
    emoji: '🐾',
    fest: 'Paw Patrol-fest',
    cake: 'Paw Patrol-kake',
    pinata: 'pote-piñata',
    copy: {
      greeting: 'Alle små hjelpere er klare for fest!',
      inviteHeadline: 'Bli med på Paw Patrol-fest, vi trenger flere hjelpere!',
      cakeIdea: 'Blå og rød kake med poteavtrykk av sjokolade',
      colouring: 'valper og utrykningsbiler',
      opening: { small: 'Du er invitert til Paw Patrol-fest!', big: 'Bli med på Paw Patrol-fest!' },
      playful: 'Alle hjelpere trengs! Det blir Paw Patrol-fest, og du er invitert.',
    },
    palette: {
      primary: '#C62828',
      primaryHover: '#A51F1F',
      onPrimary: '#FFFFFF',
      onPrimarySoft: '#FFE0DD',
      accent: '#1D4E9E',
      bg: '#F5F8FD',
      cardTint: '#E1EAF8',
      soft: '#E3EBF8',
      inviteTint: '#E1E9F6',
      inviteInk: '#1D4E9E',
    },
  },
  {
    id: 'frost',
    name: 'Frost',
    licensed: true,
    emoji: '❄️',
    fest: 'Frost-fest',
    cake: 'Frost-kake',
    pinata: 'snøkrystall-piñata',
    copy: {
      greeting: 'Det blir en iskald fest!',
      inviteHeadline: 'Bli med på Frost-fest med snø og glitter!',
      cakeIdea: 'Lyseblå og hvit kake med snøkrystaller',
      colouring: 'snøkrystaller og isslott',
      opening: { small: 'Du er invitert til Frost-fest!', big: 'Bli med på Frost-fest!' },
      playful: 'Kle deg godt, det blir kaldt og magisk! Det blir Frost-fest, og du er invitert.',
    },
    palette: {
      primary: '#1F5A8A',
      primaryHover: '#174A73',
      onPrimary: '#FFFFFF',
      onPrimarySoft: '#D9ECF8',
      accent: '#1F5A8A',
      bg: '#F3F9FD',
      cardTint: '#DCEEF9',
      soft: '#E1F0F9',
      inviteTint: '#E2F0F9',
      inviteInk: '#1F5A8A',
    },
  },
];

export function themeById(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** The palette for a party's theme, or the brand palette before a theme is chosen. */
export function paletteFor(id: ThemeId | null | undefined): ThemePalette {
  if (!id) return BRAND_PALETTE;
  return THEMES.find((t) => t.id === id)?.palette ?? BRAND_PALETTE;
}

// ---- WCAG contrast (pure maths, used by the tests and available to the UI) ----

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a #RRGGBB colour. */
export function luminance(hex: string): number {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`Not a #RRGGBB colour: ${hex}`);
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => channel(parseInt(h, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two #RRGGBB colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Fixed neutrals used on top of every palette (from the design tokens). */
export const NEUTRAL = { ink: '#1F2A26', muted: '#5F6964', white: '#FFFFFF', hot: '#B0354F' } as const;

/**
 * Every foreground/background pair a palette is used for on screen. The tests require each to
 * reach WCAG AA for normal text (4.5:1).
 */
export function contrastPairs(p: ThemePalette): { name: string; fg: string; bg: string }[] {
  return [
    { name: 'text on primary (buttons, Festen er klar)', fg: p.onPrimary, bg: p.primary },
    { name: 'button text on hover', fg: p.onPrimary, bg: p.primaryHover },
    { name: 'lede on primary', fg: p.onPrimarySoft, bg: p.primary },
    { name: 'primary text on white (light buttons, tabs)', fg: p.primary, bg: NEUTRAL.white },
    { name: 'primary text on background', fg: p.primary, bg: p.bg },
    { name: 'primary text on soft (pills, chips)', fg: p.primary, bg: p.soft },
    { name: 'accent on background', fg: p.accent, bg: p.bg },
    { name: 'accent on white', fg: p.accent, bg: NEUTRAL.white },
    { name: 'accent on card tint', fg: p.accent, bg: p.cardTint },
    { name: 'ink on background', fg: NEUTRAL.ink, bg: p.bg },
    { name: 'ink on card tint', fg: NEUTRAL.ink, bg: p.cardTint },
    { name: 'muted on background', fg: NEUTRAL.muted, bg: p.bg },
    { name: 'muted on card tint', fg: NEUTRAL.muted, bg: p.cardTint },
    { name: 'invitation headline', fg: p.inviteInk, bg: p.inviteTint },
    { name: 'invitation text', fg: NEUTRAL.ink, bg: p.inviteTint },
    { name: '«hot» date on card tint', fg: NEUTRAL.hot, bg: p.cardTint },
    { name: '«hot» date on soft', fg: NEUTRAL.hot, bg: p.soft },
  ];
}
