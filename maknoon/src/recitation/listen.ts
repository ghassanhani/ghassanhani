/**
 * Web build: no on-device speech runtime. Same exports as listen.native.ts.
 */
/** What was heard: the careful reading of every finished phrase, and a second, independent reading
 * of the same audio (a slip counts only where both agree). */
/** `text`: everything heard so far (for showing the words); `sure`: the finished phrases, read by the
 * accurate model (slips are judged on these only); `alt`: the same phrases' quick reading. */
export type Heard = { text: string; alt: string; sure: string };
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

export function warmUp() {}
