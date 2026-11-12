#!/usr/bin/env node
// Downloads the assets in itqan-assets.yaml from the public Itqan registry, the same
// way `itqan install` does (POST /packages/resolve/manifest/ → download_url), without
// the CLI binary. All assets used here are open access, so no API key is needed;
// set ITQAN_API_KEY for assets that require approval.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = process.env.ITQAN_REGISTRY_URL ?? 'https://api.cms.itqan.dev';

// Minimal reader for our manifest shape (name: / version: "…").
const yaml = readFileSync(join(root, 'itqan-assets.yaml'), 'utf8');
const assetsDir = yaml.match(/^assets_dir:\s*"?([^"\n]+)"?/m)?.[1] ?? 'assets';
const assets = {};
let current = null;
for (const line of yaml.split('\n')) {
  const name = line.match(/^ {2}([a-z0-9-]+):\s*$/);
  if (name) current = name[1];
  const ver = line.match(/^ {4}version:\s*"([^"]+)"/);
  if (ver && current) assets[current] = ver[1];
}

const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
if (process.env.ITQAN_API_KEY) headers['X-API-Key'] = process.env.ITQAN_API_KEY;
const res = await fetch(`${REGISTRY}/packages/resolve/manifest/`, { method: 'POST', headers, body: JSON.stringify({ assets }) });
if (!res.ok) throw new Error(`Registry ${res.status}: ${await res.text()}`);
const { results } = await res.json();

const lock = {};
for (const r of results) {
  if (!r.download_url) throw new Error(`${r.slug}: no download URL (access approval needed?)`);
  const dir = join(root, assetsDir, r.name || r.slug);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, decodeURIComponent(basename(new URL(r.download_url).pathname)));
  if (!existsSync(file)) {
    process.stdout.write(`↓ ${r.slug}@${r.resolved_version} … `);
    const dl = await fetch(r.download_url);
    if (!dl.ok) throw new Error(`${r.slug}: download ${dl.status}`);
    writeFileSync(file, Buffer.from(await dl.arrayBuffer()));
    console.log('ok');
  }
  if (file.endsWith('.zip')) execFileSync('unzip', ['-oq', file, '-d', dir]);
  lock[r.slug] = { version: r.resolved_version, publisher: r.publisher_name, file: basename(file) };
}
writeFileSync(join(root, assetsDir, 'pulled.json'), JSON.stringify(lock, null, 2) + '\n');
console.log(`Pulled ${results.length} asset(s) into ${assetsDir}/`);
