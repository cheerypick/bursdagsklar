import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createParty,
  EMPTY_DRAFT,
  todayOslo,
  toggleHome as toggleHomeRule,
  normalizeDraft,
  toggleTask as toggleTaskRule,
  withTheme,
  type HomeItemId,
  type ISODate,
  type Party,
  type PartyRepository,
  type SetupDraft,
  type ThemeId,
} from '../core';
import { partyRepository } from './storage';

interface PartyState {
  ready: boolean;
  today: ISODate;
  party: Party | null;
  draft: SetupDraft;
  updateDraft: (patch: Partial<SetupDraft>) => void;
  /** Creates the party from the draft, saves it and makes it active. */
  finishSetup: () => Promise<Party>;
  toggleTask: (id: string, done: boolean) => void;
  toggleHome: (id: HomeItemId) => boolean;
  /** «Velg tema» on Planen: a theme, or null for the neutral look. Saved like any change. */
  setTheme: (id: ThemeId | null) => void;
  /** «Ny fest»: removes the active party and starts a fresh setup. */
  startOver: () => Promise<void>;
}

const Ctx = createContext<PartyState | null>(null);

function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // RFC 4122 v4 fallback for runtimes without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function PartyProvider({
  children,
  repository = partyRepository,
}: {
  children: React.ReactNode;
  repository?: PartyRepository;
}) {
  const [ready, setReady] = useState(false);
  const [party, setParty] = useState<Party | null>(null);
  const [draft, setDraft] = useState<SetupDraft>(EMPTY_DRAFT);
  const today = useMemo(() => todayOslo(), []);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const activeId = await repository.getActiveId();
      const p = activeId ? await repository.get(activeId) : null;
      const d = await repository.loadDraft();
      if (!alive) return;
      setParty(p);
      if (d) setDraft(normalizeDraft(d));
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [repository]);

  const persist = useCallback(
    (p: Party) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        repository.save(p);
      }, 300);
    },
    [repository],
  );

  const update = useCallback(
    (fn: (p: Party) => Party) => {
      setParty((prev) => {
        if (!prev) return prev;
        const next = { ...fn(prev), updatedAt: new Date().toISOString() };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const updateDraft = useCallback(
    (patch: Partial<SetupDraft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        repository.saveDraft(next);
        return next;
      });
    },
    [repository],
  );

  const finishSetup = useCallback(async () => {
    const p = createParty(draft, { id: newId(), now: new Date().toISOString(), today });
    const saved = await repository.save(p);
    await repository.setActiveId(saved.id);
    await repository.saveDraft(null);
    setParty(saved);
    setDraft(EMPTY_DRAFT);
    return saved;
  }, [draft, repository, today]);

  const toggleTask = useCallback(
    (id: string, done: boolean) => update((p) => toggleTaskRule(p, id, done, new Date().toISOString())),
    [update],
  );

  const toggleHome = useCallback(
    (id: HomeItemId) => {
      const nowHas = !party?.haveAtHome.includes(id);
      update((p) => toggleHomeRule(p, id));
      return nowHas;
    },
    [party, update],
  );

  const setTheme = useCallback((id: ThemeId | null) => update((p) => withTheme(p, id)), [update]);

  const startOver = useCallback(async () => {
    if (party) await repository.remove(party.id);
    await repository.saveDraft(null);
    setParty(null);
    setDraft(EMPTY_DRAFT);
  }, [party, repository]);

  const value = useMemo<PartyState>(
    () => ({ ready, today, party, draft, updateDraft, finishSetup, toggleTask, toggleHome, setTheme, startOver }),
    [ready, today, party, draft, updateDraft, finishSetup, toggleTask, toggleHome, setTheme, startOver],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useParty(): PartyState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useParty must be used inside PartyProvider');
  return v;
}
