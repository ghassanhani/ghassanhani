/**
 * Web build: no on-device speech runtime. Same exports as listen.native.ts.
 */
export type Listening = {
  /** stop the microphone and return everything that was heard */
  stop(): Promise<string>;
  /** stop and throw the audio and text away */
  cancel(): Promise<void>;
};
export const listeningSupported = false;

export async function startListening(_onHeard?: (wordsSoFar: number) => void): Promise<Listening> {
  throw new Error('The recitation check is available in the iOS/Android app');
}
