import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { getPrefs } from '@/store/prefs';
import { PRAYERS, cityByKey, placeDay, timesFor } from './prayer-core';
import { quranIndex } from '@/content/worship';

const SURAH_NAMES: Record<number, string> = Object.fromEntries(quranIndex.surahs.map((s) => [s.n, s.name.replace(/[\u064B-\u0652\u0670]/g, '')]));
const SURAH_PAGES: Record<number, number> = Object.fromEntries(quranIndex.surahs.map((s) => [s.n, s.page]));

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
    // the reader's switches in Settings → التنبيهات: [adhan, ayah of the day, adhkar, hifz review]
    const [adhan, ayahOfDay, adhkarOn, hifzOn] = p.notifs;
    const extra: { at: Date; title: string; body: string; route: string }[] = [];
    for (let d = 0; d < DAYS; d++) {
      const t = timesFor(s, placeDay(now, city.tz, d));
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      if (ayahOfDay) extra.push({ at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8, 0), title: 'آية اليوم', body: 'آية جديدة تنتظرك في المكنون', route: '/' });
      if (adhkarOn) {
        extra.push({ at: new Date(t.fajr.getTime() + 30 * 60000), title: 'أذكار الصباح', body: 'وقت أذكار الصباح', route: '/adhkar?cat=sabah' });
        extra.push({ at: new Date(t.asr.getTime() + 30 * 60000), title: 'أذكار المساء', body: 'وقت أذكار المساء', route: '/adhkar?cat=sabah' });
      }
      // «منبّهات السنن»: reading a surah at the time the reader chose
      for (const [n, a] of Object.entries(p.sunanAlerts ?? {}))
        if (a.on) extra.push({ at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(a.at / 60), a.at % 60), title: `سورة ${SURAH_NAMES[Number(n)] ?? ''}`, body: 'حان وقت قراءتها', route: `/mushaf?page=${SURAH_PAGES[Number(n)] ?? 1}` });
      // the khatma's daily wird, at the hour the reader chose
      if (p.khatma && p.khatma.remind !== null) extra.push({ at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), p.khatma.remind, 0), title: 'ورد اليوم', body: 'ورد اليوم من ختمتك بانتظارك', route: '/khatma' });
      if (hifzOn) extra.push({ at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 20, 30), title: 'مراجعة الحفظ', body: 'خطة اليوم بانتظارك', route: '/hifz' });
      for (const pr of PRAYERS) {
        if (!adhan || !p.prayerAlerts[pr.key]) continue;
        const at = t[pr.key];
        if (at.getTime() <= now.getTime() + 5000) continue;
        jobs.push(
          Notifications.scheduleNotificationAsync({
            content: {
              title: pr.key === 'sunrise' ? 'الشروق' : `حان الآن وقت صلاة ${pr.name}`,
              body: city.name,
              sound: ADHAN_SOUND ?? true,
              data: { kind: KIND, prayer: pr.key, route: '/prayer' },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: 'prayer' },
          }),
        );
      }
    }
    // prayers first; the reminders fill what is left of iOS's 64 pending notifications
    for (const e of extra) {
      if (e.at.getTime() <= now.getTime() + 5000 || jobs.length >= 60) continue;
      jobs.push(
        Notifications.scheduleNotificationAsync({
          content: { title: e.title, body: e.body, sound: true, data: { kind: KIND, route: e.route } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: e.at, channelId: 'prayer' },
        }),
      );
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

/** Opening a notification opens its screen (prayer times, adhkar, the day's ayah, hifz). */
export function onAlertOpened(open: (route: string) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const route = r.notification.request.content.data?.route;
    if (typeof route === 'string') open(route);
  });
  return () => sub.remove();
}
