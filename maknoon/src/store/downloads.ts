import { File } from 'expo-file-system';
import { createDownloadResumable, FileSystemSessionType } from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

/**
 * Large optional downloads (the recitation and summary models). They run in an iOS background
 * session, so they carry on when the user leaves the screen or the app, and live here (not in a
 * screen) so the progress is the same wherever it is shown. A finished file is checked against its
 * SHA-256 (streamed by the system, never loaded into memory); a mismatch deletes it.
 */
export type Download = { state: 'running' | 'verifying' | 'error'; written: number; total: number };

const jobs = new Map<string, Download>();
const subs = new Set<() => void>();
const set = (key: string, d: Download | null) => {
  if (d) jobs.set(key, d);
  else jobs.delete(key);
  subs.forEach((f) => f());
};
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

/** The download under `key`, or null when none is running or failed. */
export const useDownload = (key: string) =>
  useSyncExternalStore(
    subscribe,
    () => jobs.get(key) ?? null,
    () => null,
  );

/** Fraction 0…1 (0 while the size is unknown). */
export const fraction = (d: Download | null) => (d && d.total > 0 ? Math.min(1, d.written / d.total) : 0);

/** A local note when a download ends while the app is in the background (only if alerts are allowed). */
async function notify(title: string, body: string) {
  if (AppState.currentState === 'active') return;
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {
    // no notification: the screen shows the result next time
  }
}

/**
 * Downloads `url` to `target` and checks it. Resolves when the file is ready; throws (and keeps
 * nothing) on a network error or a checksum mismatch. A second call while one runs joins it.
 */
const running = new Map<string, Promise<void>>();
export function download(key: string, url: string, target: File, sha256: string, title: string, total = 0): Promise<void> {
  const already = running.get(key);
  if (already) return already;
  const job = (async () => {
    set(key, { state: 'running', written: 0, total });
    if (target.exists) target.delete();
    try {
      let last = 0;
      const task = createDownloadResumable(url, target.uri, { sessionType: FileSystemSessionType.BACKGROUND }, (p) => {
        // at most ~4 updates a second
        const now = Date.now();
        if (now - last < 250 && p.totalBytesWritten < p.totalBytesExpectedToWrite) return;
        last = now;
        set(key, { state: 'running', written: p.totalBytesWritten, total: p.totalBytesExpectedToWrite > 0 ? p.totalBytesExpectedToWrite : total });
      });
      const res = await task.downloadAsync();
      if (!res || res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res?.status ?? '?'}`);
      const d = jobs.get(key);
      set(key, { state: 'verifying', written: d?.total ?? total, total: d?.total ?? total });
      const hash = (await new File(target.uri).digest('SHA-256')).toLowerCase();
      if (hash !== sha256) throw new Error('Checksum mismatch');
      set(key, null);
      void notify(`اكتمل تنزيل ${title}`, 'جاهز للاستخدام، ويعمل دون اتصال.');
    } catch (e) {
      if (target.exists) target.delete();
      set(key, { state: 'error', written: 0, total });
      void notify(`تعذّر تنزيل ${title}`, 'افتح الإعدادات لتعيد المحاولة.');
      throw e;
    } finally {
      running.delete(key);
    }
  })();
  running.set(key, job);
  return job;
}
