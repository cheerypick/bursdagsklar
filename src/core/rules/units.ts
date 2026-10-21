/**
 * Amounts in words, in the active language: «5 pk à 10» / «5 packs of 10», «2 flasker» / «2 bottles».
 * Every unit word the rules use goes through here, so the plurals follow i18next's rules for nb and en.
 */
import { formatNumber, t } from '../../i18n/i18n';

export const pcs = (count: number) => t('units.pcs', { count });
export const packsWord = (count: number) => t('units.packs', { count });
export const packsOf = (count: number, size: number | string) => t('units.packsOf', { count, size });
export const bottles = (count: number) => t('units.bottles', { count });
export const bags = (count: number) => t('units.bags', { count });
export const jars = (count: number) => t('units.jars', { count });
export const tins = (count: number) => t('units.tins', { count });
export const sheets = (count: number) => t('units.sheets', { count });
export const sets = (count: number) => t('units.sets', { count });
export const pieces = (count: number) => t('units.pieces', { count });
/** «ca. 2,3» / «about 2.3» (any text after the number is the caller's). */
export const about = (value: string | number) =>
  t('units.about', { value: typeof value === 'number' ? formatNumber(value) : value });
export const grams = (g: number) => t('units.g', { value: formatNumber(g) });
export const kilos = (kg: number) => t('units.kg', { value: formatNumber(kg) });
export const litres = (l: number) => t('units.litres', { value: formatNumber(l) });
/** «1 av hver» / «1 of each» */
export const each = (count: number) => t('units.each', { count });
/** «til 17» / «for 17» (plates, cups and napkins) */
export const forPeople = (count: number) => t('units.forPeople', { count });
export const kidsCount = (count: number) => t('common.kids', { count });
export const adultsCount = (count: number) => t('common.adults', { count });
export const peopleCount = (count: number) => t('common.people', { count });
