#!/usr/bin/env node
// Downloads the pinned Sunnah.com dataset snapshot (see import.mjs) and checks its SHA-256.
//   NODE_USE_ENV_PROXY=1 node pipeline/importers/sunnah/pull.mjs
import { createHash } from 'node:crypto';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const S = { repo: 'freococo/sunnah_dataset', revision: 'cc2f95cc070367c3ad6c5b672a6d16673dab566f', file: 'sunnah_com_dataset.parquet', sha256: 'e95148587e5505a3bbf85e9f5a573119eeff5ee48438983eac928853d18932ae' };
const url = `https://huggingface.co/datasets/${S.repo}/resolve/${S.revision}/${S.file}`;
const res = await fetch(url);
if (!res.ok) throw new Error(`download ${res.status}`);
const buf = Buffer.from(await res.arrayBuffer());
const sha = createHash('sha256').update(buf).digest('hex');
if (sha !== S.sha256) throw new Error(`SHA-256 ${sha}, expected ${S.sha256}: nothing written`);
const dir = join(root, 'pipeline/raw/sunnah');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, `${S.file}.tmp`), buf);
renameSync(join(dir, `${S.file}.tmp`), join(dir, S.file));
console.log(`${S.file}: ${(buf.length / 1e6).toFixed(1)} MB, SHA-256 verified`);
