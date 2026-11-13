import manifest from '../../assets/models/manifest.json';
import type { Node } from './corpus';
import type { Line } from './guard';

/**
 * Web build: the automatic summary needs the on-device model runtime, so it is an iOS/Android
 * feature. Same exports as summary.native.ts.
 */
export type { Line } from './guard';
export type SummaryInfo = { id: string; title: string; file: string; url: string; bytes: number; sha256: string; license: string; source: string; modified: string; version: number };
export type SummaryStatus = 'unsupported' | 'missing' | 'ready';
export const summaryModel = (manifest as unknown as { summary: SummaryInfo }).summary;

export const summaryStatus = (): SummaryStatus => 'unsupported';
export async function downloadSummaryModel(): Promise<void> {
  throw new Error('The automatic summary is available in the iOS/Android app');
}
export async function removeSummaryModel(): Promise<void> {}
export async function summarize(_question: string, _sources: Node[]): Promise<Line[]> {
  return [];
}
