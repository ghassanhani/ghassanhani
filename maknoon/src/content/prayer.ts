import { useEffect, useState } from 'react';
import { ar } from './quran';
import { type AsrRule, type City, dayFor, type MethodKey } from '@/worship/prayer-core';

/**
 * Formatting + the React hook around the tested prayer code (src/worship/prayer-core.ts).
 * Nothing is sent to a server.
 */
export { CITIES, METHODS, PRAYERS, cityByKey, methodAngles } from '@/worship/prayer-core';
export type { AsrRule, City, MethodKey, PrayerKey } from '@/worship/prayer-core';

/** HH:MM in the city's time zone, Arabic-Indic digits (e.g. ١٥:١٦). */
export function fmtTime(d: Date, tz: string) {
  const s = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(d);
  return ar(s.replace(/^0(\d)/, '$1'));
}

export function fmtDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `بعد ${ar(m)} دقيقة`;
  if (!m) return h === 1 ? 'بعد ساعة' : `بعد ${ar(h)} ساعات`;
  return `بعد ${h === 1 ? 'ساعة' : `${ar(h)} ساعات`} و ${ar(m)} دقيقة`;
}

/** Gregorian + Umm al-Qura Hijri date in Arabic (Hijri needs Intl calendar support). */
export function fmtDates(d: Date, tz: string) {
  const g = new Intl.DateTimeFormat('ar', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz, numberingSystem: 'arab' }).format(d);
  let h = '';
  try {
    h = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric', timeZone: tz, numberingSystem: 'arab' }).format(d);
    h = h.replace(/\s*هـ$/, '');
  } catch {
    h = '';
  }
  // Some engines (iOS) ignore numberingSystem for the Gregorian day: make every digit Arabic-Indic.
  return ar(h ? `${g} · ${h}` : g);
}

/** Re-computes every 30 s so the countdown and "next prayer" stay current. */
export function usePrayerDay(city: City, asr: AsrRule, method: MethodKey = city.method) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return { now, ...dayFor({ lat: city.lat, lng: city.lng, method, asr, tz: city.tz }, now) };
}
