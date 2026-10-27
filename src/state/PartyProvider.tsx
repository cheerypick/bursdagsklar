import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createParty,
  EMPTY_DRAFT,
  todayOslo,
  toggleHome as toggleHomeRule,
  normalizeDraft,
  toggleTask as toggleTaskRule,
  toggleDiet as toggleDietRule,
  withGoodieBagItem,
  withCustomItem,
  withFoodItem,
  withGuestCounts,
  withoutCustomItem,
  withTick,
  withTicksCleared,
  withMenu,
  withTheme,
  withInvitation,
  withCake,
  withActivity,
  type ActivityId,
  type CakeChoice,
  type DietTag,
  type InvitationSettings,
  type GoodieBagItemId,
  type HomeItemId,
  type MenuChoice,
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
  /** Mat: the main dish (null = not chosen), the dietary chips and the screen's own head-counts. */
  setMenu: (menu: MenuChoice | null) => void;
  toggleDiet: (tag: DietTag) => void;
  /** Mat tap toggle: include or leave out one food line. */
  setFoodItem: (id: string, included: boolean) => void;
  /** «Endre» on Mat: the party's own guest numbers (children in total, adults eating). */
  setGuestCounts: (change: { children?: number; adults?: number }) => void;
  /** Handleliste: tick an item off (by its stable id) or back on. */
  setTick: (id: string, ticked: boolean) => void;
  /** «Nullstill avkrysninger»: nothing ticked (her own items stay). */
  clearTicks: () => void;
  /** «Legg til vare»: her own free-text item. */
  addCustomItem: (text: string) => void;
  removeCustomItem: (id: string) => void;
  /** «Forslag til innhold» for the goodie bags: put a suggestion on the list or take it off. */
  setGoodieBagItem: (id: GoodieBagItemId, picked: boolean) => void;
  /**
   * «Start på nytt»: deletes everything the app has stored (every party, the unfinished setup,
   * the theme) and empties the in-memory state, so the theme falls back to the neutral look.
   * The caller navigates to the start screen.
   */
  startOver: () => Promise<void>;
  /** Invitasjon: the invitation screen's fields (undefined in the patch = back to the default). */
  setInvitation: (patch: Partial<InvitationSettings>) => void;
  /** Kake: the kind of cake, the glaze, the muffins and whether it is chosen (rules/cake.ts `withCake`). */
  setCake: (patch: Partial<Pick<CakeChoice, 'kind' | 'glaze' | 'muffinFlavour' | 'muffins' | 'chosen'>>) => void;
  /** Program: pick or unpick one activity idea (rules/programme.ts `withActivity`). */
  setActivity: (id: ActivityId, on: boolean) => void;
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

  const setMenu = useCallback((menu: MenuChoice | null) => update((p) => withMenu(p, menu)), [update]);
  const toggleDiet = useCallback((tag: DietTag) => update((p) => toggleDietRule(p, tag)), [update]);
  const setFoodItem = useCallback(
    (id: string, included: boolean) => update((p) => withFoodItem(p, id, included)),
    [update],
  );
  const setGuestCounts = useCallback(
    (change: { children?: number; adults?: number }) => update((p) => withGuestCounts(p, change)),
    [update],
  );

  const setTick = useCallback((id: string, ticked: boolean) => update((p) => withTick(p, id, ticked)), [update]);
  const clearTicks = useCallback(() => update(withTicksCleared), [update]);
  const addCustomItem = useCallback((text: string) => update((p) => withCustomItem(p, text)), [update]);
  const removeCustomItem = useCallback((id: string) => update((p) => withoutCustomItem(p, id)), [update]);
  const setGoodieBagItem = useCallback(
    (id: GoodieBagItemId, picked: boolean) => update((p) => withGoodieBagItem(p, id, picked)),
    [update],
  );

  const setInvitation = useCallback(
    (patch: Partial<InvitationSettings>) => update((p) => withInvitation(p, patch)),
    [update],
  );
  const setCake = useCallback(
    (patch: Partial<Pick<CakeChoice, 'kind' | 'glaze' | 'muffinFlavour' | 'muffins' | 'chosen'>>) =>
      update((p) => withCake(p, patch)),
    [update],
  );

  const setActivity = useCallback((id: ActivityId, on: boolean) => update((p) => withActivity(p, id, on)), [update]);

  const startOver = useCallback(async () => {
    // a change still waiting to be saved would write the old party back after the reset
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    await repository.reset();
    setParty(null); // → ThemeProvider gets themeId null → the neutral brand look
    setDraft(EMPTY_DRAFT);
  }, [repository]);

  const value = useMemo<PartyState>(
    () => ({
      ready,
      today,
      party,
      draft,
      updateDraft,
      finishSetup,
      toggleTask,
      toggleHome,
      setTheme,
      setMenu,
      toggleDiet,
      setFoodItem,
      setGuestCounts,
      setTick,
      clearTicks,
      addCustomItem,
      removeCustomItem,
      setGoodieBagItem,
      startOver,
      setInvitation,
      setCake,
      setActivity,
    }),
    [
      ready,
      today,
      party,
      draft,
      updateDraft,
      finishSetup,
      toggleTask,
      toggleHome,
      setTheme,
      setMenu,
      toggleDiet,
      setFoodItem,
      setGuestCounts,
      setTick,
      clearTicks,
      addCustomItem,
      removeCustomItem,
      setGoodieBagItem,
      startOver,
      setInvitation,
      setCake,
      setActivity,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useParty(): PartyState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useParty must be used inside PartyProvider');
  return v;
}
