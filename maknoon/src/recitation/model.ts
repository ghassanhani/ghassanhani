import manifest from '../../assets/models/manifest.json';

/**
 * Web build: the recitation check needs a native speech runtime, so it is an
 * iOS/Android feature. Same exports as model.native.ts.
 */
export type ModelInfo = { id: string; title: string; file: string; bytes: number | null; sha256: string | null; license: string; source: string; modified: string; version: number };
export const recitationModel = (manifest as { recitation: ModelInfo }).recitation;
export type ModelStatus = 'unsupported' | 'unavailable' | 'missing' | 'ready';

export const modelStatus = (): ModelStatus => 'unsupported';
export const modelUri = (): string | null => null;
export async function downloadModel(): Promise<void> {
  throw new Error('The recitation check is available in the iOS/Android app');
}
export async function removeModel(): Promise<void> {}
