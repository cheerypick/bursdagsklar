import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPartyRepository, memoryStore, type KeyValueStore } from '../core';

/**
 * AsyncStorage on iOS/Android; on web its shim is window.localStorage.
 * Falls back to memory if storage is unavailable (private mode, blocked storage).
 */
function pickStore(): KeyValueStore {
  try {
    return AsyncStorage as unknown as KeyValueStore;
  } catch {
    return memoryStore();
  }
}

/** The one store on this device: the parties and the language choice. */
export const appStore = pickStore();
export const partyRepository = createPartyRepository(appStore);
