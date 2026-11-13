import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import manifest from '../../assets/models/manifest.json';
import { download } from '@/store/downloads';
import { getPrefs, setPrefs } from '@/store/prefs';
import type { ModelInfo, ModelStatus } from './model';

/**
 * The optional speech-model pack for the recitation check (SPEC §2.12): downloaded once
 * from `expo.extra.modelBaseUrl` (GitHub, pinned to a commit), verified against the manifest's SHA-256, kept on the device.
 * Until the converted model is published (manifest sha256 = null) the feature reports 'unavailable'.
 */
export type { ModelInfo, ModelStatus } from './model';
export const recitationModel = (manifest as { recitation: ModelInfo }).recitation;

// The model is served from the repository (pinned to the commit that added it); packsBaseUrl is the fallback.
const extra = Constants.expoConfig?.extra as { modelBaseUrl?: unknown; packsBaseUrl?: unknown } | undefined;
const rawBase = extra?.modelBaseUrl ?? extra?.packsBaseUrl;
const baseUrl = typeof rawBase === 'string' && /^https:\/\//.test(rawBase) ? rawBase.replace(/\/$/, '') : null;
const dir = () => new Directory(Paths.document, 'models');
const file = () => new File(dir(), `${recitationModel.id}.v${recitationModel.version}.bin`);

export function modelStatus(): ModelStatus {
  if (getPrefs().recitationModel && file().exists) return 'ready';
  return baseUrl && recitationModel.sha256 ? 'missing' : 'unavailable';
}
export const modelUri = (): string | null => (modelStatus() === 'ready' ? file().uri : null);

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
