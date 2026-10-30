import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import type { CardId } from '../core';
import { inviteCards } from '../theme/images';

/**
 * The drawing for the printed cards, iOS/Android version: the bundled picture read once as a data URI, so the
 * PDF made by expo-print needs no files or network (the HTML is printed from memory). Without it (a read that
 * fails) the cards still print, on plain paper.
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
    const asset = await Asset.fromModule(inviteCards[id]).downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    const base64 = await new File(uri).base64();
    return `data:image/webp;base64,${base64}`;
  } catch {
    loaded.delete(id);
    return undefined;
  }
}
