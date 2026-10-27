/**
 * Storage for parties, behind an interface so the backing store can change.
 *
 * Today: one key per party in a key-value store (AsyncStorage on iOS/Android,
 * which is localStorage on web). Each party is ONE self-contained record with a
 * stable uuid, createdAt/updatedAt and schemaVersion, so a later server sync can
 * PUT/GET the same JSON by id and resolve conflicts by updatedAt, without a rewrite.
 *
 *   bursdagsklar:index        { schemaVersion, activeId, ids: string[] }
 *   bursdagsklar:party:<id>   Party JSON
 *   bursdagsklar:draft        the unfinished setup (so a reload keeps it)
 *
 * Every key the app writes starts with `bursdagsklar:`; `reset()` («Start på nytt») removes them all,
 * except `bursdagsklar:language` (the language picker's choice is a device setting, not part of a plan).
 */
import type { MenuChoice, Party } from '../model';
import { GOODIE_BAG_ITEMS, SCHEMA_VERSION } from '../model';
import { withoutHiddenDishes } from '../rules/dishes';
import { normalizeDraft, type SetupDraft } from '../party';
import { clampAge } from '../rules/celebrants';
import { THEMES } from '../themes';
import { sanitizeInvitation } from '../rules/invitation';

/** The minimal async key-value API both AsyncStorage and an in-memory test store implement. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  /** Every key in the store. Optional: AsyncStorage (and so localStorage on web) has it. */
  getAllKeys?(): Promise<readonly string[]>;
}

export interface PartyRepository {
  list(): Promise<Party[]>;
  get(id: string): Promise<Party | null>;
  /** Insert or replace by id. Sets updatedAt. Returns the stored record. */
  save(party: Party): Promise<Party>;
  remove(id: string): Promise<void>;
  getActiveId(): Promise<string | null>;
  setActiveId(id: string | null): Promise<void>;
  loadDraft(): Promise<SetupDraft | null>;
  saveDraft(draft: SetupDraft | null): Promise<void>;
  /**
   * «Start på nytt»: removes everything this app has stored — every party, the active id, the
   * unfinished setup and any other `bursdagsklar:` key (an older theme or draft key included).
   * Keys of other apps on the same origin are left alone.
   */
  reset(): Promise<void>;
}

const PREFIX = 'bursdagsklar';
const INDEX_KEY = `${PREFIX}:index`;
const DRAFT_KEY = `${PREFIX}:draft`;
/** The theme lived in its own key before it moved onto the party; reset() still clears it. */
const LEGACY_THEME_KEY = `${PREFIX}:theme`;
const partyKey = (id: string) => `${PREFIX}:party:${id}`;
/** The language choice (src/i18n/index.ts): a setting for the device, so «Start på nytt» keeps it. */
export const LANGUAGE_KEY = `${PREFIX}:language`;
/** True for a key this app owns. */
export const isAppKey = (key: string) => key.startsWith(`${PREFIX}:`);

interface Index {
  schemaVersion: number;
  activeId: string | null;
  ids: string[];
}

/** A party saved before Handleliste (schemaVersion 5): no list state, no goodie-bag choice. */
type PartyV5 = Omit<Party, 'schemaVersion' | 'shopping' | 'goodieBags'> & { schemaVersion: 5 };

/**
 * A party saved before the one children number (schemaVersion 4): `kidsInvited` counted the invited
 * children WITHOUT the birthday children, plus an unused `siblingsAttending`.
 */
type PartyV4 = Omit<PartyV5, 'schemaVersion' | 'children'> & {
  schemaVersion: 4;
  kidsInvited: number;
  siblingsAttending?: number;
};

/** A party saved by the first Mat screen (schemaVersion 3): its own child/adult counts, no item flags. */
type PartyV3 = Omit<PartyV4, 'schemaVersion' | 'foodItems'> & {
  schemaVersion: 3;
  foodCounts?: { kids: number; adults: number } | null;
};

/** A party saved before the Mat screen (schemaVersion 2): a pre-filled menu plus a `menuChosen` flag. */
type PartyV2 = Omit<PartyV3, 'schemaVersion' | 'menu' | 'diets' | 'foodCounts'> & {
  schemaVersion: 2;
  menu?: MenuChoice;
  menuChosen?: boolean;
};

/** A party saved before joint birthdays (schemaVersion 1): one `child`, a required theme. */
type PartyV1 = Omit<PartyV2, 'schemaVersion' | 'celebrants'> & {
  schemaVersion: 1;
  child: { name: string; age: number };
};

/** v1 → v2: the single child is wrapped into `celebrants`; its age is kept inside 3–10. */
function migrateV1(r: PartyV1): PartyV2 {
  const { child, ...rest } = r;
  const name = typeof child?.name === 'string' ? child.name : '';
  const age = typeof child?.age === 'number' ? clampAge(child.age) : 5;
  return { ...rest, schemaVersion: 2, theme: rest.theme ?? null, celebrants: [{ id: 'c1', name, age }] };
}

/**
 * v2 → v3: the menu was pre-filled from the date (grill in summer) with `menuChosen: false`.
 * Only a menu the parent actually picked survives; everything else opens with no menu chosen.
 */
function migrateV2(r: PartyV2): PartyV3 {
  const { menu, menuChosen, ...rest } = r;
  return {
    ...rest,
    schemaVersion: 3,
    menu: menuChosen && menu ? menu : null,
    diets: [],
    foodCounts: null,
  };
}

/**
 * v3 → v4: one source of truth for the guest count. The Mat screen's own `foodCounts` copy is dropped
 * (the food follows the party's numbers again, which «Endre» on Mat now edits), and every food line
 * starts included (`foodItems: {}`).
 */
function migrateV3(r: PartyV3): PartyV4 {
  const { foodCounts: _dropped, ...rest } = r;
  void _dropped;
  return { ...rest, schemaVersion: 4, foodItems: {} };
}

/**
 * v4 → v5: one children number. The stored invited count N becomes N + the birthday children (plus
 * any siblings), the same real head-count as before, now as the total that Planen, Mat and the texts show.
 */
function migrateV4(r: PartyV4): PartyV5 {
  const { kidsInvited, siblingsAttending, ...rest } = r;
  const invited = typeof kidsInvited === 'number' ? kidsInvited : 0;
  const siblings = typeof siblingsAttending === 'number' ? siblingsAttending : 0;
  const celebrants = Array.isArray(rest.celebrants) ? rest.celebrants.length : 1;
  return {
    ...rest,
    schemaVersion: 5,
    foodItems: rest.foodItems && typeof rest.foodItems === 'object' ? rest.foodItems : {},
    children: invited + celebrants + siblings,
  };
}

/** v5 → v6: Handleliste. Nothing ticked, no own items, nothing picked for the goodie bags. */
function migrateV5(r: PartyV5): Party {
  return { ...r, schemaVersion: SCHEMA_VERSION, goodieBags: { contents: [] }, shopping: { ticked: [], custom: [] } };
}

/** Defensive: a current record with a missing or hand-edited field still opens. */
function normalizeCurrent(p: Party): Party {
  const foodItems = p.foodItems && typeof p.foodItems === 'object' ? p.foodItems : {};
  const contents = Array.isArray(p.goodieBags?.contents) ? p.goodieBags.contents : [];
  const goodieBags = { contents: GOODIE_BAG_ITEMS.filter((id) => contents.includes(id)) };
  const s = p.shopping;
  const shopping = {
    ticked: Array.isArray(s?.ticked) ? s.ticked.filter((x): x is string => typeof x === 'string') : [],
    custom: Array.isArray(s?.custom)
      ? s.custom.filter((c) => c && typeof c.id === 'string' && typeof c.text === 'string')
      : [],
  };
  return { ...p, foodItems, goodieBags, shopping };
}

/**
 * Upgrades a stored record to the current schemaVersion. Add a case per version bump;
 * never change the meaning of an old field in place.
 */
export function migrate(raw: unknown): Party | null {
  const p = migrateRecord(raw);
  // taco and pasta are hidden for now (rules/dishes.ts HIDDEN_MENU_CARDS): a party saved with one of them
  // opens with that dish unpicked, never a crash or an invisible dish
  // a theme that has since been removed (havfruer, Oct 2026) opens as «Uten tema», never as another theme
  if (!p) return null;
  const { invitation: rawInvitation, ...rest } = p;
  const invitation = sanitizeInvitation(rawInvitation);
  return {
    ...rest,
    menu: withoutHiddenDishes(p.menu),
    theme: knownTheme(p.theme),
    ...(invitation ? { invitation } : {}),
  };
}

/** The stored theme if it is still offered, else null (the neutral look). */
function knownTheme(id: unknown): Party['theme'] {
  return THEMES.find((t) => t.id === id)?.id ?? null;
}

function migrateRecord(raw: unknown): Party | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Party> & { schemaVersion?: number };
  if (typeof r.id !== 'string') return null;
  switch (r.schemaVersion as number) {
    case 1:
      return migrateV5(migrateV4(migrateV3(migrateV2(migrateV1(r as unknown as PartyV1)))));
    case 2:
      return migrateV5(migrateV4(migrateV3(migrateV2(r as unknown as PartyV2))));
    case 3:
      return migrateV5(migrateV4(migrateV3(r as unknown as PartyV3)));
    case 4:
      return migrateV5(migrateV4(r as unknown as PartyV4));
    case 5:
      return normalizeCurrent(migrateV5(r as unknown as PartyV5));
    case SCHEMA_VERSION:
      return normalizeCurrent(r as Party);
    default:
      // Unknown (newer or corrupt) record: keep it on disk, but do not load it.
      return null;
  }
}

export function createPartyRepository(
  store: KeyValueStore,
  clock: () => string = () => new Date().toISOString(),
): PartyRepository {
  async function readIndex(): Promise<Index> {
    const raw = await store.getItem(INDEX_KEY);
    if (!raw) return { schemaVersion: SCHEMA_VERSION, activeId: null, ids: [] };
    try {
      const idx = JSON.parse(raw) as Index;
      return {
        schemaVersion: SCHEMA_VERSION,
        activeId: idx.activeId ?? null,
        ids: Array.isArray(idx.ids) ? idx.ids : [],
      };
    } catch {
      return { schemaVersion: SCHEMA_VERSION, activeId: null, ids: [] };
    }
  }
  async function writeIndex(idx: Index) {
    await store.setItem(INDEX_KEY, JSON.stringify(idx));
  }

  const repo: PartyRepository = {
    async list() {
      const idx = await readIndex();
      const out: Party[] = [];
      for (const id of idx.ids) {
        const p = await repo.get(id);
        if (p) out.push(p);
      }
      return out;
    },
    async get(id) {
      const raw = await store.getItem(partyKey(id));
      if (!raw) return null;
      try {
        return migrate(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    async save(party) {
      const stored: Party = { ...party, schemaVersion: SCHEMA_VERSION, updatedAt: clock() };
      await store.setItem(partyKey(party.id), JSON.stringify(stored));
      const idx = await readIndex();
      if (!idx.ids.includes(party.id)) await writeIndex({ ...idx, ids: [...idx.ids, party.id] });
      return stored;
    },
    async remove(id) {
      await store.removeItem(partyKey(id));
      const idx = await readIndex();
      await writeIndex({
        ...idx,
        ids: idx.ids.filter((x) => x !== id),
        activeId: idx.activeId === id ? null : idx.activeId,
      });
    },
    async getActiveId() {
      return (await readIndex()).activeId;
    },
    async setActiveId(id) {
      const idx = await readIndex();
      await writeIndex({ ...idx, activeId: id });
    },
    async loadDraft() {
      const raw = await store.getItem(DRAFT_KEY);
      if (!raw) return null;
      try {
        return normalizeDraft(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    async saveDraft(draft) {
      if (draft) await store.setItem(DRAFT_KEY, JSON.stringify(draft));
      else await store.removeItem(DRAFT_KEY);
    },
    async reset() {
      const idx = await readIndex();
      const keys = new Set<string>([INDEX_KEY, DRAFT_KEY, LEGACY_THEME_KEY, ...idx.ids.map(partyKey)]);
      // parties that fell out of the index, and keys from older versions, when the store can list keys
      if (store.getAllKeys) {
        try {
          for (const k of await store.getAllKeys()) if (isAppKey(k) && k !== LANGUAGE_KEY) keys.add(k);
        } catch {
          // listing is a bonus; the known keys above are removed regardless
        }
      }
      for (const k of keys) await store.removeItem(k);
    },
  };
  return repo;
}

/** In-memory store for tests and for environments with no storage. */
export function memoryStore(): KeyValueStore & { dump(): Record<string, string> } {
  const m = new Map<string, string>();
  return {
    async getItem(k) {
      return m.has(k) ? m.get(k)! : null;
    },
    async setItem(k, v) {
      m.set(k, v);
    },
    async removeItem(k) {
      m.delete(k);
    },
    async getAllKeys() {
      return [...m.keys()];
    },
    dump() {
      return Object.fromEntries(m);
    },
  };
}
