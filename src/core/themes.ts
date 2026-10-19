import type { ThemeId } from './model';

export interface Theme {
  id: ThemeId;
  /** Shown on the theme card and in the plan header. */
  name: string;
  /** «enhjørningfest» — used in invitation texts. */
  fest: string;
  /** Invitation card headline. */
  invite: string;
  /** «Enhjørningkake» */
  cake: string;
  /** «enhjørning-piñata» */
  pinata: string;
  /** Background tint for the invitation card on «Festen er klar». */
  tint: string;
  /** Accent text colour on the card. */
  accent: string;
}

/**
 * Pokémon, Paw Patrol and Frost are trademarks. We only use the names in text
 * («Pokémon-fest») and our own palette/mood illustrations: no characters,
 * no logos, no official art.
 */
export const THEMES: Theme[] = [
  {
    id: 'enhjorning',
    name: 'Enhjørning',
    fest: 'enhjørningfest',
    invite: 'Bli med på enhjørningfest!',
    cake: 'Enhjørningkake',
    pinata: 'enhjørning-piñata',
    tint: '#F7E6EE',
    accent: '#7a5a6d',
  },
  {
    id: 'dinosaurer',
    name: 'Dinosaurer',
    fest: 'dinosaurfest',
    invite: 'Bli med på dinosaurfest!',
    cake: 'Dinosaurkake',
    pinata: 'dinosaur-piñata',
    tint: '#E3ECDD',
    accent: '#3f5e3a',
  },
  {
    id: 'verdensrommet',
    name: 'Verdensrommet',
    fest: 'romfest',
    invite: 'Bli med på romfest!',
    cake: 'Romkake',
    pinata: 'rakett-piñata',
    tint: '#E2E6F2',
    accent: '#3b4a74',
  },
  {
    id: 'fotball',
    name: 'Fotball',
    fest: 'fotballfest',
    invite: 'Bli med på fotballfest!',
    cake: 'Fotballkake',
    pinata: 'fotball-piñata',
    tint: '#E3EEE0',
    accent: '#2f5a37',
  },
  {
    id: 'havfruer',
    name: 'Havfruer',
    fest: 'havfruefest',
    invite: 'Bli med på havfruefest!',
    cake: 'Havfruekake',
    pinata: 'havfrue-piñata',
    tint: '#DDEEF0',
    accent: '#2f6470',
  },
  {
    id: 'dyr-i-skogen',
    name: 'Dyr i skogen',
    fest: 'skogsfest',
    invite: 'Bli med på skogsfest!',
    cake: 'Skogskake',
    pinata: 'rev-piñata',
    tint: '#F1E7DA',
    accent: '#7a5232',
  },
  {
    id: 'pokemon',
    name: 'Pokémon',
    fest: 'Pokémon-fest',
    invite: 'Bli med på Pokémon-fest!',
    cake: 'Pokémon-kake',
    pinata: 'lyn-piñata',
    tint: '#FBEFC9',
    accent: '#9a3a2a',
  },
  {
    id: 'paw-patrol',
    name: 'Paw Patrol',
    fest: 'Paw Patrol-fest',
    invite: 'Bli med på Paw Patrol-fest!',
    cake: 'Paw Patrol-kake',
    pinata: 'pote-piñata',
    tint: '#E1E9F6',
    accent: '#2c4a86',
  },
  {
    id: 'frost',
    name: 'Frost',
    fest: 'Frost-fest',
    invite: 'Bli med på Frost-fest!',
    cake: 'Frost-kake',
    pinata: 'snøkrystall-piñata',
    tint: '#E6F1F8',
    accent: '#3a6587',
  },
];

export function themeById(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
