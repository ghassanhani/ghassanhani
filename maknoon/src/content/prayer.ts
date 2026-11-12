import { CalculationMethod, Coordinates, Madhab, PrayerTimes, Qibla } from 'adhan';
import { useEffect, useState } from 'react';
import { ar } from './quran';

/**
 * Prayer times and qibla computed on the device with Adhan (MIT, batoulapps).
 * Nothing is sent to a server. Default: a manual city (plan §13), Muslim World
 * League (Fajr 18°, Isha 17°) as on the design, Asr per the user's choice.
 */
export type City = { name: string; lat: number; lng: number; tz: string };
export type AsrRule = 'j' | 'h'; // جمهور (Shafi'i shadow) | حنفية

export const PRAYERS = [
  { key: 'fajr', name: 'الفجر' },
  { key: 'sunrise', name: 'الشروق' },
  { key: 'dhuhr', name: 'الظهر' },
  { key: 'asr', name: 'العصر' },
  { key: 'maghrib', name: 'المغرب' },
  { key: 'isha', name: 'العشاء' },
] as const;
export type PrayerKey = (typeof PRAYERS)[number]['key'];

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
  return h ? `${g} · ${h}` : g;
}

export function computeDay(city: City, asr: AsrRule, date = new Date()) {
  const coords = new Coordinates(city.lat, city.lng);
  const params = CalculationMethod.MuslimWorldLeague();
  params.madhab = asr === 'h' ? Madhab.Hanafi : Madhab.Shafi;
  const pt = new PrayerTimes(coords, date, params);
  const times = PRAYERS.map((p) => ({ ...p, date: pt[p.key] as Date }));
  const now = date.getTime();
  // next obligatory prayer (sunrise is not one); after Isha → tomorrow's Fajr
  const obligatory = times.filter((t) => t.key !== 'sunrise');
  let next = obligatory.find((t) => t.date.getTime() > now);
  if (!next) {
    const tomorrow = new PrayerTimes(coords, new Date(now + 86400000), params);
    next = { key: 'fajr', name: 'الفجر', date: tomorrow.fajr };
  }
  const prevIdx = obligatory.findIndex((t) => t.key === next!.key) - 1;
  const prev = prevIdx >= 0 ? obligatory[prevIdx] : null;
  return { times, next, prev, qibla: Qibla(coords) };
}

/** Re-computes every 30 s so the countdown and "next prayer" stay current. */
export function usePrayerDay(city: City, asr: AsrRule) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return { now, ...computeDay(city, asr, now) };
}
