/**
 * Web build: no on-device speech runtime. Same exports as listen.native.ts.
 */
/** What was heard: the careful reading of every finished phrase, and a second, independent reading
 * of the same audio (a slip counts only where both agree). */
export type Heard = { text: string; alt: string };
export type Listening = {
  /** stop the microphone and return everything that was heard */
  stop(): Promise<Heard>;
  /** stop and throw the audio and text away */
  cancel(): Promise<void>;
};
export const listeningSupported = false;

export async function startListening(_onHeard?: (soFar: Heard) => void): Promise<Listening> {
  throw new Error('The recitation check is available in the iOS/Android app');
}
