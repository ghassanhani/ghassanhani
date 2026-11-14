import Constants from 'expo-constants';
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

// The model is served from the repository (pinned to the commit that added it); packsBaseUrl is the fallback.
const extra = Constants.expoConfig?.extra as { modelBaseUrl?: unknown; packsBaseUrl?: unknown } | undefined;
const rawBase = extra?.modelBaseUrl ?? extra?.packsBaseUrl;
const baseUrl = typeof rawBase === 'string' && /^https:\/\//.test(rawBase) ? rawBase.replace(/\/$/, '') : null;
const dir = () => new Directory(Paths.document, 'models');
const file = () => new File(dir(), `${recitationModel.id}.v${recitationModel.version}.bin`);

const proFile = () => new File(dir(), `${recitationPro.id}.v${recitationPro.version}.bin`);
const proReady = () => getPrefs().recitationPro && proFile().exists;

export function modelStatus(): ModelStatus {
  if (proReady() || (getPrefs().recitationModel && file().exists)) return 'ready';
  return baseUrl && recitationModel.sha256 ? 'missing' : 'unavailable';
}
/** The model the recitation check uses: the accurate one when it is installed, else the standard one. */
export const modelUri = (): string | null => (proReady() ? proFile().uri : getPrefs().recitationModel && file().exists ? file().uri : null);

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

/** Download and verify the model (in the background; progress via useDownload('recitation')). Throws on network or checksum errors (nothing is kept). */
export async function downloadModel(): Promise<void> {
  if (!baseUrl || !recitationModel.sha256) throw new Error('The recitation model is not published yet');
  if (!dir().exists) dir().create({ intermediates: true });
  await download('recitation', `${baseUrl}/${recitationModel.file}`, file(), recitationModel.sha256, recitationModel.title, recitationModel.bytes ?? 0);
  setPrefs({ recitationModel: true });
}

export async function removeModel(): Promise<void> {
  const f = file();
  if (f.exists) f.delete();
  setPrefs({ recitationModel: false });
}
