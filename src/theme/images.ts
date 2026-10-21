/** Bundled images (our own illustrations and photos from the approved prototype). */
import type { ImageSourcePropType } from 'react-native';
import type { ThemeId } from '../core';

export const images = {
  hero: require('../../assets/images/hero.webp'),
  inviteArt: require('../../assets/images/invite-art.webp'),
  grill: require('../../assets/images/grill.webp'),
  cake: require('../../assets/images/cake.webp'),
  muffins: require('../../assets/images/muffins.webp'),
  pinata: require('../../assets/images/pinata.webp'),
  skattejakt: require('../../assets/images/skattejakt.webp'),
  fiskedam: require('../../assets/images/fiskedam.webp'),
  gjoremal: require('../../assets/images/gjoremal.webp'),
  menuPizza: require('../../assets/images/menu-pizza.webp'),
  menuTaco: require('../../assets/images/menu-taco.webp'),
  menuPasta: require('../../assets/images/menu-pasta.webp'),
  menuAnnet: require('../../assets/images/menu-annet.webp'),
} satisfies Record<string, ImageSourcePropType>;

/**
 * Theme tiles. Pokémon, Paw Patrol and Frost use our own mood illustrations
 * (lightning and stars; a toy fire truck and paw prints; snowflakes) — no official art or logos.
 */
export const themeImages: Record<ThemeId, ImageSourcePropType> = {
  enhjorning: require('../../assets/images/theme-enhjorning.webp'),
  dinosaurer: require('../../assets/images/theme-dinosaur.webp'),
  verdensrommet: require('../../assets/images/theme-verdensrommet.webp'),
  fotball: require('../../assets/images/theme-fotball.webp'),
  havfruer: require('../../assets/images/theme-havfrue.webp'),
  'dyr-i-skogen': require('../../assets/images/theme-dyr.webp'),
  pokemon: require('../../assets/images/theme-pokemon.webp'),
  'paw-patrol': require('../../assets/images/theme-paw-patrol.webp'),
  frost: require('../../assets/images/theme-frost.webp'),
};
