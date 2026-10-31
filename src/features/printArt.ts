import { Asset } from 'expo-asset';
import type { CardId } from '../core';
import { inviteCards } from '../theme/images';

/**
 * The drawing for the printed cards, web version: the bundled picture's URL. The print view sits in the same
 * page, so the browser loads it like any other picture; `cardArt` also waits until it is loaded, so the print
 * dialog never opens on cards without their drawing. (iOS/Android: ./printArt.native.ts.)
 */
const loaded = new Map<CardId, Promise<string | undefined>>();

export function cardArt(id: CardId): Promise<string | undefined> {
  let p = loaded.get(id);
  if (!p) {
    p = load(id);
    loaded.set(id, p);
  }
  return p;
}

async function load(id: CardId): Promise<string | undefined> {
  try {
    const uri = Asset.fromModule(inviteCards[id]).uri;
    const g = globalThis as { location?: Location; Image?: typeof Image };
    const url = g.location ? new URL(uri, g.location.href).href : uri;
    if (g.Image) {
      await new Promise<void>((resolve) => {
        const img = new g.Image!();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      });
    }
    return url;
  } catch {
    loaded.delete(id);
    return undefined;
  }
}
