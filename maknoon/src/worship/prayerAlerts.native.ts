import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { getPrefs } from '@/store/prefs';
import { PRAYERS, cityByKey, placeDay, timesFor } from './prayer-core';

/**
 * Prayer-time alerts: local notifications scheduled on the device from the on-device times
 * (Adhan library, the reader's city, method and Asr rule). No server, nothing leaves the phone.
 *
 * iOS keeps at most 64 pending notifications, so the next DAYS days are scheduled and the set is
 * rebuilt whenever the app opens or a setting changes. The sound is the adhan file when one is
 * bundled (ADHAN_SOUND; iOS plays at most 30 s of a notification sound), the system sound until then.
 */
const DAYS = 6;
const ADHAN_SOUND: string | null = null; // e.g. 'adhan.caf' once the founder's recording is added
const KIND = 'prayer-alert';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

let channelReady = false;
async function androidChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync('prayer', {
    name: 'مواقيت الصلاة',
    importance: AndroidImportance.HIGH,
    sound: ADHAN_SOUND ?? 'default',
  });
  channelReady = true;
}

/** Asks once, when the reader turns a prayer bell on. */
export async function askAlertPermission(): Promise<boolean> {
  const now = await Notifications.getPermissionsAsync();
  if (now.granted) return true;
  if (!now.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

let running: Promise<void> | null = null;
/** Rebuilds the scheduled alerts from the current settings (only when notifications are allowed). */
export function syncPrayerAlerts(): Promise<void> {
  running = (running ?? Promise.resolve()).then(async () => {
    const perm = await Notifications.getPermissionsAsync();
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(pending.filter((n) => n.content.data?.kind === KIND).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    if (!perm.granted) return;
    await androidChannel();
    const p = getPrefs();
    const city = cityByKey(p.city);
    const s = { lat: city.lat, lng: city.lng, method: (p.prayerMethod ?? city.method) as typeof city.method, asr: p.asr, tz: city.tz };
    const now = new Date();
    const jobs: Promise<string>[] = [];
    for (let d = 0; d < DAYS; d++) {
      const t = timesFor(s, placeDay(now, city.tz, d));
      for (const pr of PRAYERS) {
        if (!p.prayerAlerts[pr.key]) continue;
        const at = t[pr.key];
        if (at.getTime() <= now.getTime() + 5000) continue;
        jobs.push(
          Notifications.scheduleNotificationAsync({
            content: {
              title: pr.key === 'sunrise' ? 'الشروق' : `حان الآن وقت صلاة ${pr.name}`,
              body: city.name,
              sound: ADHAN_SOUND ?? true,
              data: { kind: KIND, prayer: pr.key },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: 'prayer' },
          }),
        );
      }
    }
    await Promise.all(jobs.slice(0, 60));
  }).catch(() => undefined);
  return running;
}

/** Plays the alert once now (a test from the prayer screen). */
export async function previewAdhan(): Promise<void> {
  if (!(await askAlertPermission())) return;
  await androidChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'تجربة تنبيه الأذان', body: 'هكذا يصلك تنبيه الصلاة', sound: ADHAN_SOUND ?? true, data: { kind: 'preview' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: 'prayer' },
  });
}
