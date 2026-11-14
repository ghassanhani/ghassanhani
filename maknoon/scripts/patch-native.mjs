// Small, idempotent changes to two native packages, applied after `npm install`.
//
// 1. whisper.rn — adds `audioCtx` (whisper.cpp's audio_ctx). Without it every reading encodes a
//    full 30 s window even for 3 s of speech; sized to the audio, a reading of a few seconds is
//    about three times faster (measured on recitation audio with the Tarteel base model, same text).
//
// 2. expo-speech-recognition (iOS) — privacy. The package only passes `requiresOnDeviceRecognition`
//    on when the recognizer says it supports on-device recognition; otherwise it quietly falls back
//    to Apple's servers. Here the flag is always passed, so a phone that cannot recognise the
//    language on the device fails the request instead (the app then uses Whisper alone). Audio
//    never leaves the device.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function patch(path, marker, anchor, replacement, name) {
  const file = new URL(`../node_modules/${path}`, import.meta.url);
  if (!existsSync(file)) return;
  const src = readFileSync(file, 'utf8');
  if (src.includes(marker)) return;
  if (!src.includes(anchor)) {
    console.warn(`patch-native: ${name}: anchor not found (package changed?); not patched`);
    process.exitCode = 0;
    return;
  }
  writeFileSync(file, src.replace(anchor, replacement));
  console.log(`patch-native: ${name} patched`);
}

const best = '    config.params.greedy.best_of =\n        getIntProperty(runtime, options, "bestOf", config.params.greedy.best_of);';
patch(
  'whisper.rn/cpp/jsi/RNWhisperJSI.cpp',
  'encoder window in 20 ms frames',
  best,
  best + '\n    // encoder window in 20 ms frames (0 = the full 30 s): short audio encodes several times faster\n    config.params.audio_ctx = getIntProperty(runtime, options, "audioCtx", config.params.audio_ctx);',
  'whisper.rn audioCtx',
);

patch(
  'expo-speech-recognition/ios/ExpoSpeechRecognizer.swift',
  'never fall back to the server',
  '    if recognizer.supportsOnDeviceRecognition {\n      request.requiresOnDeviceRecognition = options.requiresOnDeviceRecognition\n    }',
  '    // Maknoon: never fall back to the server — on-device or the request fails\n    request.requiresOnDeviceRecognition = options.requiresOnDeviceRecognition',
  'expo-speech-recognition on-device only',
);
