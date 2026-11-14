/** Web build: no on-device speech recognizer; the check runs without the live stream. Same exports as stream.native.ts. */
export type Stream = { stop: () => void };
export async function startStream(_pageWords: string[], _onText: (soFar: string) => void): Promise<Stream | null> {
  return null;
}
