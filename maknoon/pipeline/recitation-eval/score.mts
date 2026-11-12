// Scores what the model heard against the planned mistakes (SPEC M10: catch rate and false-alarm rate).
//   npm run recitation:eval
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from '../../src/recitation/match.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const dir = join(root, 'pipeline/raw/recitation-eval');
if (!existsSync(join(dir, 'cases.json')) || !existsSync(join(dir, 'heard.json'))) {
  console.error(`Nothing to score. See pipeline/recitation-eval/README.md (expected cases.json and heard.json in ${dir}).`);
  process.exit(1);
}
type Case = { file: string; ayat: string[]; mistakes: { ayah: string; kind: 'missing' | 'changed' | 'skipped-ayah' }[] };
const cases = JSON.parse(readFileSync(join(dir, 'cases.json'), 'utf8')) as Case[];
const heard = JSON.parse(readFileSync(join(dir, 'heard.json'), 'utf8')) as Record<string, string>;
const plain = JSON.parse(readFileSync(join(root, 'assets/content/quran-search.json'), 'utf8')) as Record<string, string>;

let planned = 0;
let caught = 0;
let falseAlarms = 0;
let cleanAyat = 0;
for (const c of cases) {
  const r = check(c.ayat.map((key) => ({ key, text: plain[key] })), heard[c.file] ?? '', { finished: true });
  const wrong = new Set(c.mistakes.map((m) => m.ayah));
  for (const m of c.mistakes) {
    planned++;
    // A mistake counts as caught when its ayah is flagged at all: the user is sent to the right place.
    if (r.flags.some((f) => f.ayah === m.ayah)) caught++;
    else console.log(`MISSED  ${c.file}  ${m.ayah} (${m.kind})`);
  }
  for (const key of c.ayat) {
    if (wrong.has(key)) continue;
    cleanAyat++;
    const n = r.flags.filter((f) => f.ayah === key).length;
    if (n) {
      falseAlarms++;
      console.log(`FALSE   ${c.file}  ${key} (${n} flag${n > 1 ? 's' : ''})`);
    }
  }
}
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(0)}%` : 'n/a');
console.log(`\nRecordings: ${cases.length}`);
console.log(`Catch rate:       ${caught}/${planned} = ${pct(caught, planned)}`);
console.log(`False-alarm rate: ${falseAlarms}/${cleanAyat} correctly recited ayat = ${pct(falseAlarms, cleanAyat)}`);
