import { describe, expect, it } from 'vitest';
import { createPartyRepository, memoryStore, type KeyValueStore } from '../storage/PartyRepository';
import { emma } from '../__fixtures__/emma';
import { EMPTY_DRAFT } from '../party';

/** A store with every bursdagsklar key the app writes, plus one key from another app on the same origin. */
async function filledStore() {
  const store = memoryStore();
  const repo = createPartyRepository(store);
  const a = await repo.save(emma());
  const b = await repo.save({ ...emma(), id: 'party-2' });
  await repo.setActiveId(a.id);
  await repo.saveDraft({ ...EMPTY_DRAFT, celebrants: [{ id: 'c1', name: 'Jonas', age: 7 }] });
  await store.setItem('bursdagsklar:theme', 'frost'); // the old, separate theme key
  await store.setItem('bursdagsklar:party:orphan', '{}'); // a party no longer in the index
  await store.setItem('other-app:token', 'keep-me');
  return { store, repo, ids: [a.id, b.id] };
}

describe('PartyRepository.reset («Start på nytt»)', () => {
  it('removes every bursdagsklar key: parties, active id, draft, theme', async () => {
    const { store, repo, ids } = await filledStore();
    await repo.reset();
    expect(Object.keys(store.dump()).filter((k) => k.startsWith('bursdagsklar'))).toEqual([]);
    expect(await repo.getActiveId()).toBeNull();
    expect(await repo.list()).toEqual([]);
    for (const id of ids) expect(await repo.get(id)).toBeNull();
    expect(await repo.loadDraft()).toBeNull();
  });

  it('leaves keys of other apps alone', async () => {
    const { store, repo } = await filledStore();
    await repo.reset();
    expect(store.dump()).toEqual({ 'other-app:token': 'keep-me' });
  });

  it('a fresh repository on the same store (a reload) finds nothing', async () => {
    const { store, repo } = await filledStore();
    await repo.reset();
    const again = createPartyRepository(store);
    expect(await again.getActiveId()).toBeNull();
    expect(await again.list()).toEqual([]);
    expect(await again.loadDraft()).toBeNull();
  });

  it('works on a store that cannot list its keys (removes the known ones)', async () => {
    const { store, repo, ids } = await filledStore();
    const noList: KeyValueStore = {
      getItem: (k) => store.getItem(k),
      setItem: (k, v) => store.setItem(k, v),
      removeItem: (k) => store.removeItem(k),
    };
    await createPartyRepository(noList).reset();
    const left = Object.keys(store.dump());
    for (const k of [
      'bursdagsklar:index',
      'bursdagsklar:draft',
      'bursdagsklar:theme',
      ...ids.map((id) => `bursdagsklar:party:${id}`),
    ])
      expect(left).not.toContain(k);
    expect(await repo.getActiveId()).toBeNull();
  });

  it('is safe on an empty store and when listing keys fails', async () => {
    await expect(createPartyRepository(memoryStore()).reset()).resolves.toBeUndefined();
    const { store } = await filledStore();
    const failing: KeyValueStore = {
      getItem: (k) => store.getItem(k),
      setItem: (k, v) => store.setItem(k, v),
      removeItem: (k) => store.removeItem(k),
      getAllKeys: () => Promise.reject(new Error('blocked')),
    };
    await createPartyRepository(failing).reset();
    expect(await store.getItem('bursdagsklar:index')).toBeNull();
  });
});
