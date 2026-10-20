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
 */
import type { Party } from '../model';
import { SCHEMA_VERSION } from '../model';
import { normalizeDraft, type SetupDraft } from '../party';
import { clampAge } from '../rules/celebrants';

/** The minimal async key-value API both AsyncStorage and an in-memory test store implement. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
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
}

const PREFIX = 'bursdagsklar';
const INDEX_KEY = `${PREFIX}:index`;
const DRAFT_KEY = `${PREFIX}:draft`;
const partyKey = (id: string) => `${PREFIX}:party:${id}`;

interface Index {
  schemaVersion: number;
  activeId: string | null;
  ids: string[];
}

/** A party saved before joint birthdays (schemaVersion 1): one `child`, a required theme. */
type PartyV1 = Omit<Party, 'schemaVersion' | 'celebrants'> & {
  schemaVersion: 1;
  child: { name: string; age: number };
};

/** v1 → v2: the single child is wrapped into `celebrants`; its age is kept inside 3–10. */
function migrateV1(r: PartyV1): Party {
  const { child, ...rest } = r;
  const name = typeof child?.name === 'string' ? child.name : '';
  const age = typeof child?.age === 'number' ? clampAge(child.age) : 5;
  return { ...rest, schemaVersion: SCHEMA_VERSION, theme: rest.theme ?? null, celebrants: [{ id: 'c1', name, age }] };
}

/**
 * Upgrades a stored record to the current schemaVersion. Add a case per version bump;
 * never change the meaning of an old field in place.
 */
export function migrate(raw: unknown): Party | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Party> & { schemaVersion?: number };
  if (typeof r.id !== 'string') return null;
  switch (r.schemaVersion as number) {
    case 1:
      return migrateV1(r as unknown as PartyV1);
    case SCHEMA_VERSION:
      return r as Party;
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
    dump() {
      return Object.fromEntries(m);
    },
  };
}
