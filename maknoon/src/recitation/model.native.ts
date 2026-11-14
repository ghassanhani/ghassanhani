import { Asset } from 'expo-asset';
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import manifest from '../../assets/models/manifest.json';
import { download } from '@/store/downloads';
import { getPrefs, setPrefs } from '@/store/prefs';
import type { ModelInfo, ModelStatus, ProInfo } from './model';

/**
 * The optional speech-model pack for the recitation check (SPEC §2.12): downloaded once
 * from `expo.extra.modelBaseUrl` (GitHub, pinned to a commit), verified against the manifest's SHA-256, kept on the device.
 * Until the converted model is published (manifest sha256 = null) the feature reports 'unavailable'.
 */
export type { ModelInfo, ModelStatus, ProInfo } from './model';
export const recitationModel = (manifest as { recitation: ModelInfo }).recitation;
/** The more accurate model (whisper-small, Quran), served in parts and joined on the phone. */
export const recitationPro = (manifest as unknown as { recitationPro: ProInfo }).recitationPro;

const dir = () => new Directory(Paths.document, 'models');
const file = () => new File(dir(), `${recitationModel.id}.v${recitationModel.version}.bin`);

const proFile = () => new File(dir(), `${recitationPro.id}.v${recitationPro.version}.bin`);
const proReady = () => getPrefs().recitationPro && proFile().exists;

// The standard model is bundled with the app, so the check is always ready; the accurate model is an optional download.
export function modelStatus(): ModelStatus {
  return 'ready';
}
/**
 * The two models' roles while listening: the bundled standard model reads the words as they are
 * recited; the accurate model, when downloaded, re-reads every finished phrase (else the standard
 * model does both).
 */
export async function modelUris(): Promise<{ fast: string; accurate: string }> {
  removeOldDownload();
  const base = await bundledUri();
  return { fast: base, accurate: proReady() ? proFile().uri : base };
}

/** The standard Quran model (Tarteel base), bundled with the app: no download. */
let basePath: Promise<string> | null = null;
function bundledUri(): Promise<string> {
  basePath ??= (async () => {
    const a = Asset.fromModule(require('../../assets/models/ggml-tarteel-base-ar-quran-q5_1.bin'));
    await a.downloadAsync();
    return a.localUri ?? a.uri;
  })();
  basePath.catch(() => (basePath = null));
  return basePath;
}

export const proStatus = (): 'ready' | 'missing' | 'unavailable' => (proReady() ? 'ready' : recitationPro.base ? 'missing' : 'unavailable');

/**
 * Downloads the accurate model: each part in the background (checked against its own SHA-256),
 * then joins them on the phone in 8 MB steps and checks the whole file's SHA-256. Throws, keeping
 * nothing, on any mismatch. Progress via useDownload('recitation-pro-<n>').
 */
export async function downloadPro(): Promise<void> {
  if (!recitationPro.base) throw new Error('Not published yet');
  if (!dir().exists) dir().create({ intermediates: true });
  const parts = recitationPro.parts.map((p, i) => ({ ...p, f: new File(dir(), `${recitationPro.id}.part${i}`) }));
  for (const [i, p] of parts.entries()) await download(`recitation-pro-${i}`, `${recitationPro.base}/${p.file}`, p.f, p.sha256, `${recitationPro.title} (${i + 1}/${parts.length})`, p.bytes);
  const out = proFile();
  try {
    if (out.exists) out.delete();
    out.create();
    const w = out.open(FileMode.ReadWrite);
    try {
      for (const p of parts) {
        const r = p.f.open(FileMode.ReadOnly);
        try {
          for (;;) {
            const chunk = await r.readBytes(8 * 1024 * 1024);
            if (!chunk.length) break;
            await w.writeBytes(chunk);
          }
        } finally {
          r.close();
        }
      }
    } finally {
      w.close();
    }
    const hash = (await out.digest('SHA-256')).toLowerCase();
    if (hash !== recitationPro.sha256) throw new Error('Checksum mismatch');
    setPrefs({ recitationPro: true });
  } catch (e) {
    if (out.exists) out.delete();
    throw e;
  } finally {
    for (const p of parts) if (p.f.exists) p.f.delete();
  }
}

export async function removePro(): Promise<void> {
  const f = proFile();
  if (f.exists) f.delete();
  setPrefs({ recitationPro: false });
}

/** The standard model used to be a download; it is bundled now, so a downloaded copy is removed. */
export function removeOldDownload(): void {
  try {
    const f = file();
    if (f.exists) f.delete();
  } catch {
    // nothing to remove
  }
  if (getPrefs().recitationModel) setPrefs({ recitationModel: false });
}
