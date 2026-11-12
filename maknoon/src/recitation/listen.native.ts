import { PermissionsAndroid, Platform } from 'react-native';
import { initWhisper, type WhisperContext } from 'whisper.rn/index';
import { RealtimeTranscriber } from 'whisper.rn/realtime-transcription/index';
import { AudioPcmStreamAdapter } from 'whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter';
import type { Listening } from './listen';
import { modelUri } from './model';

/**
 * Microphone → on-device Whisper (SPEC §2.12, M10).
 *
 * Privacy: audio is captured as PCM in memory, transcribed on the device and dropped.
 * The transcriber is given NO filesystem and NO output path, so it cannot write a
 * recording; nothing here opens a network connection.
 */
export type { Listening } from './listen';
export const listeningSupported = true;

let context: Promise<WhisperContext> | null = null;
function whisper(): Promise<WhisperContext> {
  const uri = modelUri();
  if (!uri) throw new Error('Recitation model not installed');
  if (!context) {
    const c = initWhisper({ filePath: uri });
    c.catch(() => (context = null));
    context = c;
  }
  return context;
}

async function microphoneAllowed(): Promise<boolean> {
  if (Platform.OS !== 'android') return true; // iOS asks when the stream starts (NSMicrophoneUsageDescription)
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

export async function startListening(onHeard?: (wordsSoFar: number) => void): Promise<Listening> {
  if (!(await microphoneAllowed())) throw new Error('Microphone permission denied');
  const whisperContext = await whisper();
  const slices = new Map<number, string>(); // text per audio slice, in order
  const text = () =>
    [...slices.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, t]) => t)
      .join(' ');

  const transcriber = new RealtimeTranscriber(
    { whisperContext, audioStream: new AudioPcmStreamAdapter() }, // no `fs`: audio is never written to disk
    { audioSliceSec: 25, transcribeOptions: { language: 'ar' }, promptPreviousSlices: false },
    {
      onTranscribe: (e) => {
        if (e.type !== 'transcribe' || !e.data) return;
        slices.set(e.sliceIndex, e.data.result.trim());
        onHeard?.(text().split(/\s+/).filter(Boolean).length);
      },
    },
  );
  await transcriber.start();

  return {
    async stop() {
      await transcriber.stop(); // finishes the last slice before returning
      const heard = text();
      await transcriber.release();
      return heard;
    },
    async cancel() {
      await transcriber.stop();
      await transcriber.release();
      slices.clear();
    },
  };
}
