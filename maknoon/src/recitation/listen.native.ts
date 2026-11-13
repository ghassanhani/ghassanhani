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

export async function startListening(onHeard?: (textSoFar: string) => void): Promise<Listening> {
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
    {
      // Short slices: each one is decoded on its own, so the model writes what it hears instead of
      // completing a long passage from memory (it was trained on the Quran and would otherwise
      // "correct" a slip). Short slices also come back fast enough to follow the reciter.
      audioSliceSec: 8,
      audioMinSec: 0.6,
      realtimeProcessingPauseMs: 700,
      promptPreviousSlices: false,
      transcribeOptions: {
        language: 'ar',
        maxContext: 0, // no earlier text as a hint
        temperature: 0, // the most likely reading of the audio, never a sampled guess
        temperatureInc: 0, // no retries at higher temperature (they drift towards the memorized text)
        beamSize: 1,
      },
    },
    {
      onTranscribe: (e) => {
        if (e.type !== 'transcribe' || !e.data) return;
        slices.set(e.sliceIndex, e.data.result.trim());
        onHeard?.(text()); // partial results arrive while the reciter is still speaking
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
