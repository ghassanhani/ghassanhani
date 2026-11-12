import { CalculationMethod, type CalculationParameters, Coordinates, HighLatitudeRule, Madhab, PrayerTimes, Qibla } from 'adhan';

/**
 * Prayer times and qibla — plain, tested code on top of Adhan (MIT). No React, no
 * storage, no network: everything here runs on the device (SPEC §2.10, CLAUDE.md rule 6).
 * Checked against Adhan's own reference tables in tests/prayer.test.mts.
 */
export type MethodKey =
  | 'MuslimWorldLeague'
  | 'UmmAlQura'
  | 'Egyptian'
  | 'Karachi'
  | 'Dubai'
  | 'Qatar'
  | 'Kuwait'
  | 'Turkey'
  | 'Singapore'
  | 'Tehran'
  | 'NorthAmerica'
  | 'MoonsightingCommittee';
export type AsrRule = 'j' | 'h'; // الجمهور (ظل المثل) | الحنفية (ظل المثلين)
export type HighLat = 'MiddleOfTheNight' | 'SeventhOfTheNight' | 'TwilightAngle';
export type City = { key: string; name: string; lat: number; lng: number; tz: string; method: MethodKey };

/** The authorities Adhan implements. Names only; the angles come from the library. */
export const METHODS: { key: MethodKey; name: string }[] = [
  { key: 'MuslimWorldLeague', name: 'رابطة العالم الإسلامي' },
  { key: 'UmmAlQura', name: 'أم القرى · مكة المكرمة' },
  { key: 'Egyptian', name: 'الهيئة المصرية العامة للمساحة' },
  { key: 'Karachi', name: 'جامعة العلوم الإسلامية · كراتشي' },
  { key: 'Dubai', name: 'دبي' },
  { key: 'Qatar', name: 'قطر' },
  { key: 'Kuwait', name: 'الكويت' },
  { key: 'Turkey', name: 'رئاسة الشؤون الدينية التركية' },
  { key: 'Singapore', name: 'سنغافورة' },
  { key: 'Tehran', name: 'جامعة طهران' },
  { key: 'NorthAmerica', name: 'الجمعية الإسلامية لأمريكا الشمالية' },
  { key: 'MoonsightingCommittee', name: 'لجنة رؤية الهلال' },
];

/**
 * Manual cities (SPEC §2.10: a chosen city is the default; GPS is optional).
 * `method` is only a starting suggestion where Adhan has that country's own
 * authority; elsewhere it is Muslim World League. The user can always change it.
 */
export const CITIES: City[] = [
  { key: 'makkah', name: 'مكة المكرمة', lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh', method: 'UmmAlQura' },
  { key: 'madinah', name: 'المدينة المنورة', lat: 24.4672, lng: 39.6111, tz: 'Asia/Riyadh', method: 'UmmAlQura' },
  { key: 'riyadh', name: 'الرياض', lat: 24.7136, lng: 46.6753, tz: 'Asia/Riyadh', method: 'UmmAlQura' },
  { key: 'cairo', name: 'القاهرة', lat: 30.0444, lng: 31.2357, tz: 'Africa/Cairo', method: 'Egyptian' },
  { key: 'dubai', name: 'دبي', lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai', method: 'Dubai' },
  { key: 'doha', name: 'الدوحة', lat: 25.2854, lng: 51.531, tz: 'Asia/Qatar', method: 'Qatar' },
  { key: 'kuwait', name: 'الكويت', lat: 29.3759, lng: 47.9774, tz: 'Asia/Kuwait', method: 'Kuwait' },
  { key: 'istanbul', name: 'إسطنبول', lat: 41.0082, lng: 28.9784, tz: 'Europe/Istanbul', method: 'Turkey' },
  { key: 'karachi', name: 'كراتشي', lat: 24.8607, lng: 67.0011, tz: 'Asia/Karachi', method: 'Karachi' },
  { key: 'singapore', name: 'سنغافورة', lat: 1.3521, lng: 103.8198, tz: 'Asia/Singapore', method: 'Singapore' },
  { key: 'barcelona', name: 'برشلونة', lat: 41.3874, lng: 2.1686, tz: 'Europe/Madrid', method: 'MuslimWorldLeague' },
  { key: 'paris', name: 'باريس', lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris', method: 'MuslimWorldLeague' },
  { key: 'berlin', name: 'برلين', lat: 52.52, lng: 13.405, tz: 'Europe/Berlin', method: 'MuslimWorldLeague' },
  { key: 'london', name: 'لندن', lat: 51.5074, lng: -0.1278, tz: 'Europe/London', method: 'MoonsightingCommittee' },
  { key: 'newyork', name: 'نيويورك', lat: 40.7128, lng: -74.006, tz: 'America/New_York', method: 'NorthAmerica' },
  { key: 'toronto', name: 'تورنتو', lat: 43.6532, lng: -79.3832, tz: 'America/Toronto', method: 'NorthAmerica' },
];
export const DEFAULT_CITY = 'barcelona';
export const cityByKey = (key: string): City => CITIES.find((c) => c.key === key) ?? CITIES.find((c) => c.key === DEFAULT_CITY)!;

export const PRAYERS = [
  { key: 'fajr', name: 'الفجر' },
  { key: 'sunrise', name: 'الشروق' },
  { key: 'dhuhr', name: 'الظهر' },
  { key: 'asr', name: 'العصر' },
  { key: 'maghrib', name: 'المغرب' },
  { key: 'isha', name: 'العشاء' },
] as const;
export type PrayerKey = (typeof PRAYERS)[number]['key'];

export type Settings = { lat: number; lng: number; method: MethodKey; asr: AsrRule; highLat?: HighLat };

/** Adhan parameters for a place. Far from the equator, Adhan's recommended rule keeps Fajr/Isha defined. */
export function paramsFor(s: Settings): CalculationParameters {
  const p = CalculationMethod[s.method]();
  p.madhab = s.asr === 'h' ? Madhab.Hanafi : Madhab.Shafi;
  p.highLatitudeRule = s.highLat ? HighLatitudeRule[s.highLat] : HighLatitudeRule.recommended(new Coordinates(s.lat, s.lng));
  return p;
}

/** The six times of one civil day at a place. */
export function timesFor(s: Settings, date: Date): Record<PrayerKey, Date> {
  const pt = new PrayerTimes(new Coordinates(s.lat, s.lng), date, paramsFor(s));
  return { fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha };
}

/** Today's times, the next obligatory prayer (after Isha: tomorrow's Fajr) and the one before it. */
export function dayFor(s: Settings, now: Date) {
  const t = timesFor(s, now);
  const times = PRAYERS.map((p) => ({ ...p, date: t[p.key] }));
  const obligatory = times.filter((x) => x.key !== 'sunrise');
  let next: { key: PrayerKey; name: string; date: Date } | undefined = obligatory.find((x) => x.date.getTime() > now.getTime());
  if (!next) next = { key: 'fajr', name: 'الفجر', date: timesFor(s, new Date(now.getTime() + 86400000)).fajr };
  const i = obligatory.findIndex((x) => x.key === next!.key) - 1;
  const prev = i >= 0 ? obligatory[i] : null;
  return { times, next, prev, qibla: qiblaFor(s.lat, s.lng) };
}

/** Bearing to the Kaaba in degrees clockwise from true north. */
export const qiblaFor = (lat: number, lng: number): number => Qibla(new Coordinates(lat, lng));

/** "الفجر ١٨° · العشاء ١٧°" style facts for the chosen method, read from Adhan (never typed). */
export function methodAngles(method: MethodKey): { fajr: number; isha: number; ishaInterval: number } {
  const p = CalculationMethod[method]();
  return { fajr: p.fajrAngle, isha: p.ishaAngle, ishaInterval: p.ishaInterval };
}
