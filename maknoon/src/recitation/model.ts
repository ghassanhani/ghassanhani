import manifest from '../../assets/models/manifest.json';

/**
 * Web build: the recitation check needs a native speech runtime, so it is an
 * iOS/Android feature. Same exports as model.native.ts.
 */
export type ModelInfo = { id: string; title: string; file: string; bytes: number | null; sha256: string | null; license: string; source: string; modified: string; version: number };
export const recitationModel = (manifest as { recitation: ModelInfo }).recitation;
export type ModelStatus = 'unsupported' | 'unavailable' | 'missing' | 'ready';
export type ProInfo = { id: string; title: string; file: string; parts: { file: string; bytes: number; sha256: string }[]; base: string | null; bytes: number; sha256: string; license: string; source: string; modified: string; version: number };
export const recitationPro = (manifest as unknown as { recitationPro: ProInfo }).recitationPro;
export const proStatus = (): 'ready' | 'missing' | 'unavailable' | 'unsupported' => 'unsupported';
export async function downloadPro(): Promise<void> {
  throw new Error('The recitation check is available in the iOS/Android app');
}
export async function removePro(): Promise<void> {}

export const modelStatus = (): ModelStatus => 'unsupported';
export const modelUri = (): string | null => null;
export async function modelUris(): Promise<{ fast: string; accurate: string }> {
  throw new Error('The recitation check is available in the iOS/Android app');
}
export async function downloadModel(): Promise<void> {
  throw new Error('The recitation check is available in the iOS/Android app');
}
export async function removeModel(): Promise<void> {}
