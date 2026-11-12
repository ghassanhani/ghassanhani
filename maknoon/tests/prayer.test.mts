// SPEC M5: Maknoon's prayer code must match Adhan's reference tables for the supported methods.
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { CITIES, METHODS, dayFor, type HighLat, type MethodKey, qiblaFor, timesFor } from '../src/worship/prayer-core.ts';
import { ROOT, readJson } from './helpers.mts';

type Ref = {
  params: { latitude: number; longitude: number; timezone: string; method: string; madhab: string; highLatitudeRule: HighLat };
  variance?: number;
  times: Record<'date' | 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', string>[];
};
const METHOD: Record<string, MethodKey> = { Gulf: 'Dubai' };
const minutes = (s: string) => {
  const [, h, m, ap] = s.match(/(\d+):(\d+) (AM|PM)/)!;
  return ((+h % 12) + (ap === 'PM' ? 12 : 0)) * 60 + +m;
};
const localMinutes = (d: Date, tz: string) => {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(d).split(':');
  return (+h % 24) * 60 + +m;
};

const dir = join(ROOT, 'tests/fixtures/adhan-times');
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  test(`matches Adhan reference: ${file}`, () => {
    const ref = readJson<Ref>(`tests/fixtures/adhan-times/${file}`);
    const p = ref.params;
    const method = (METHOD[p.method] ?? p.method) as MethodKey;
    assert.ok(METHODS.some((m) => m.key === method), `method ${p.method} is offered in the app`);
    const tol = ref.variance ?? 0;
    for (const row of ref.times) {
      const [y, mo, d] = row.date.split('-').map(Number);
      const t = timesFor({ lat: p.latitude, lng: p.longitude, method, asr: p.madhab === 'Hanafi' ? 'h' : 'j', highLat: p.highLatitudeRule }, new Date(y, mo - 1, d));
      for (const k of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
        const diff = Math.abs(localMinutes(t[k], p.timezone) - minutes(row[k]));
        assert.ok(diff <= tol, `${row.date} ${k}: expected ${row[k]}, off by ${diff} min (allowed ${tol})`);
      }
    }
  });
}

test('Hanafi Asr is later than the majority Asr', () => {
  const c = CITIES[0];
  const d = new Date(2026, 5, 1);
  const j = timesFor({ lat: c.lat, lng: c.lng, method: c.method, asr: 'j' }, d).asr;
  const h = timesFor({ lat: c.lat, lng: c.lng, method: c.method, asr: 'h' }, d).asr;
  assert.ok(h.getTime() > j.getTime());
});

test('after Isha the next prayer is tomorrow’s Fajr', () => {
  const c = CITIES[0];
  const s = { lat: c.lat, lng: c.lng, method: c.method, asr: 'j' as const };
  const isha = timesFor(s, new Date(2026, 5, 1)).isha;
  const day = dayFor(s, new Date(isha.getTime() + 60000));
  assert.equal(day.next.key, 'fajr');
  assert.ok(day.next.date.getTime() > isha.getTime());
});

test('every city gets six valid times, summer and winter (high latitudes included)', () => {
  for (const c of CITIES)
    for (const d of [new Date(2026, 5, 21), new Date(2026, 11, 21)]) {
      const t = timesFor({ lat: c.lat, lng: c.lng, method: c.method, asr: 'j' }, d);
      const order = [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map((x) => x.getTime());
      assert.ok(order.every((x) => Number.isFinite(x)), c.key);
      assert.deepEqual([...order].sort((a, b) => a - b), order, `${c.key}: times in order`);
    }
});

test('qibla bearing: Makkah-adjacent sanity and a known direction', () => {
  // From Madinah the Kaaba lies almost due south; from Cairo, south-east.
  const mad = CITIES.find((c) => c.key === 'madinah')!;
  const cai = CITIES.find((c) => c.key === 'cairo')!;
  assert.ok(Math.abs(qiblaFor(mad.lat, mad.lng) - 180) < 10);
  const q = qiblaFor(cai.lat, cai.lng);
  assert.ok(q > 120 && q < 150, String(q));
});
