/**
 * Domain types for one birthday party.
 *
 * A Party is stored as ONE record (see src/storage/partyStore.ts) with a stable
 * uuid, createdAt/updatedAt and a schemaVersion, so it can later be synced to a
 * server as-is without a rewrite.
 */

/** 'YYYY-MM-DD', a local calendar date in Europe/Oslo. */
export type ISODate = string;
/** 'HH:MM', 24h. */
export type HHMM = string;

export type ThemeId =
  | 'enhjorning'
  | 'dinosaurer'
  | 'verdensrommet'
  | 'fotball'
  | 'havfruer'
  | 'dyr-i-skogen'
  | 'pokemon'
  | 'paw-patrol'
  | 'frost';

export type AllergyTag = 'notter' | 'peanott' | 'melk' | 'egg' | 'gluten' | 'ikke-svin' | 'vegetar' | 'annet';

export type HomeItemId =
  | 'grill'
  | 'langpanne'
  | 'bursdagskrone'
  | 'laken-fiskedam'
  | 'fiskestang'
  | 'muffinsformer'
  | 'saftdispenser'
  | 'kakelys'
  | 'pappkrus-og-fat'
  | 'ballonger'
  | 'pizzahjul'
  | 'stor-kjele';

export type MenuChoice =
  | { kind: 'grillpolser' }
  | { kind: 'wienerpolser' }
  | { kind: 'pizza'; style: 'hjemmelaget' | 'frossen' | 'bestilt'; takeawaySize?: '30' | '40' }
  | { kind: 'taco'; shells?: boolean }
  | {
      kind: 'egen';
      name: string;
      unit: 'stk' | 'porsjoner' | 'g' | 'dl';
      perChild: number;
      perAdult: number;
      bufferPct: 0 | 10 | 25 | 35;
      packSize?: number;
    };

export type MenuKind = MenuChoice['kind'];

export interface CakeChoice {
  mode: 'bake' | 'buy';
  cakeId: string;
  muffins: boolean;
}

export interface Guest {
  id: string;
  label: string;
  status: 'pending' | 'yes' | 'no';
  adultsStaying: 0 | 1 | 2;
  allergies: AllergyTag[];
  note?: string;
}

export interface TaskState {
  done: boolean;
  doneAt?: string;
  hidden?: boolean;
}

export const SCHEMA_VERSION = 1 as const;

export interface Party {
  /** Stable id (crypto.randomUUID). Never changes, also not when synced. */
  id: string;
  schemaVersion: typeof SCHEMA_VERSION;
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
  /** The day the to-do dates were computed from; reset when the party date changes. */
  plannedFrom: ISODate;
  child: { name: string; age: number };
  date: ISODate;
  start: HHMM;
  end: HHMM;
  theme: ThemeId;
  home: { type: 'hus' | 'leilighet' | null; garden: boolean | null };
  /** Invited children, not counting the birthday child. 1..40 */
  kidsInvited: number;
  siblingsAttending: number;
  hostAdults: number;
  menu: MenuChoice;
  /** false until the parent has picked a menu on the Mat screen (milestone 2). */
  menuChosen: boolean;
  cake: CakeChoice;
  programme: { includePinata: boolean; includeSkattejakt: boolean };
  guests: Guest[];
  haveAtHome: HomeItemId[];
  taskState: Record<string, TaskState>;
}

export interface Task {
  id: string;
  date: ISODate;
  title: string;
  detail?: string;
  link?: { label: string; route: string };
  /** Shown, but not tickable (the RSVP deadline). */
  milestone?: boolean;
  /** Done automatically at setup (the guest list). */
  auto?: boolean;
}

export type ShoppingUnit = 'stk' | 'g' | 'dl' | 'l' | 'pk' | 'boks' | 'flaske' | 'pose' | 'glass' | 'beger';

export interface ShoppingItem {
  id: string;
  name: string;
  why?: string;
  need: number;
  unit: ShoppingUnit;
  packSize?: number;
  packs?: number;
  display: string;
  trip: 'torrvarer' | 'ferskvarer';
  homeItemId?: HomeItemId;
  ruleRef: string;
}
