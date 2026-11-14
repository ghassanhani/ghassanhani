import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

/**
 * The live half of the recitation check (founder decision 2026-11-14, «hybrid»): the phone's own
 * speech recognizer (Apple on iOS, Google on Android) streams words as they are said, so the page
 * follows the reciter smoothly. It only moves the reveal forward; slips are still judged by the
 * Quran-trained Whisper model (listen.native.ts), since this recognizer was not trained on recitation.
 *
 * Privacy: on-device recognition only. iOS: the request requires on-device recognition (the
 * package is patched so it cannot fall back to Apple's servers, scripts/patch-native.mjs).
 * Android: only the on-device recognizer (Android 13+) is used. Where the phone cannot recognise
 * Arabic on the device, this returns null and the check runs on Whisper alone.
 */
export type Stream = { stop: () => void };
const LANG = 'ar-SA';

export async function startStream(pageWords: string[], onText: (soFar: string) => void): Promise<Stream | null> {
  try {
    if (Platform.OS === 'android' && (typeof Platform.Version !== 'number' || Platform.Version < 33)) return null;
    if (Platform.OS === 'android' && !ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) return null;
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return null;
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return null;

    // the recognizer restarts its transcript after a pause (iOS 18+): what came before is kept
    let committed = '';
    let current = '';
    let live = true;
    const emit = () => live && onText(`${committed} ${current}`.trim());
    const subs = [
      ExpoSpeechRecognitionModule.addListener('result', (e) => {
        const t = (e.results[0]?.transcript ?? '').trim();
        const restarted = current && t && !t.startsWith(current.split(' ')[0]) && t.length < current.length;
        if (restarted) committed = `${committed} ${current}`.trim();
        current = t;
        if (e.isFinal) {
          committed = `${committed} ${current}`.trim();
          current = '';
        }
        emit();
      }),
      // not available on this phone (no on-device Arabic, permission, …): Whisper carries on alone
      ExpoSpeechRecognitionModule.addListener('error', () => stop()),
    ];
    const stop = () => {
      if (!live) return;
      live = false;
      for (const s of subs) s.remove();
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // already stopped
      }
    };
    ExpoSpeechRecognitionModule.start({
      lang: LANG,
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: true,
      addsPunctuation: false,
      // the words of the page bias the recognizer toward them (the text is never sent anywhere)
      contextualStrings: [...new Set(pageWords)].slice(0, 100),
      // share the microphone with the Whisper stream
      iosCategory: { category: 'playAndRecord', categoryOptions: ['defaultToSpeaker', 'allowBluetooth', 'mixWithOthers'], mode: 'measurement' },
    });
    return { stop };
  } catch {
    return null;
  }
}
