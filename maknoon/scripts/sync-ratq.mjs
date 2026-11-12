#!/usr/bin/env node
// Snapshots the Ratq (رَتْق) resource catalogue into assets/content/ratq-catalog.json.
// Ratq lists Quranic resources with licence + publisher; files themselves live on Itqan CMS.
// The snapshot powers attribution strings and the licence gate (no NC sources in a paid app).
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://ratq.itqan.dev/api/resources';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets/content/ratq-catalog.json');

const keep = ['slug', 'name', 'name_ar', 'type', 'license', 'source_url', 'website_url', 'github_url', 'short_description', 'version'];
const resources = [];
for (let page = 1; ; page++) {
  const res = await fetch(`${API}?page_size=100&page=${page}`);
  if (!res.ok) throw new Error(`Ratq ${res.status} on page ${page}`);
  const data = await res.json();
  for (const r of data.results) {
    const o = Object.fromEntries(keep.map((k) => [k, r[k] ?? null]));
    o.publisher = r.publisher ? { name: r.publisher.name, name_ar: r.publisher.name_ar } : null;
    resources.push(o);
  }
  if (!data.next) break;
}
resources.sort((a, b) => a.slug.localeCompare(b.slug));
writeFileSync(out, JSON.stringify({ source: API, fetchedAt: new Date().toISOString(), count: resources.length, resources }, null, 1) + '\n');
console.log(`Saved ${resources.length} Ratq resources → ${out}`);
