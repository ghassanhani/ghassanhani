/**
 * Still images of Mushaf pages for the page curl. Drawing the curl from live page copies meant
 * ~30 full pages of text on screen at once; an image per page is drawn by the GPU and costs
 * almost nothing. Shots are taken once, in the background, and kept for the last few pages.
 * Native only (react-native-view-shot); the web preview keeps drawing live pages.
 */
import type React from 'react';
import { Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/** What a ref on a View holds (the native element view-shot captures). */
export type ShotTarget = React.ComponentRef<typeof View>;

export const shotsSupported = Platform.OS !== 'web';
const cache = new Map<number, string>(); // page → file uri
const KEEP = 12;

export const pageShot = (page: number) => cache.get(page) ?? null;

export async function takePageShot(page: number, view: ShotTarget) {
  if (!shotsSupported) return null;
  const uri = await captureRef(view as unknown as Parameters<typeof captureRef>[0], { format: 'jpg', quality: 0.92, result: 'tmpfile' });
  cache.delete(page);
  cache.set(page, uri);
  while (cache.size > KEEP) cache.delete(cache.keys().next().value as number);
  return uri;
}
