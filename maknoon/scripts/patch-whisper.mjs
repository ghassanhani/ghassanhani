// Adds one option to whisper.rn (runs after `npm install`, idempotent): `audioCtx`, whisper.cpp's
// audio_ctx. Without it every reading encodes a full 30 s window even for 3 s of speech; with the
// window sized to the audio, a reading of a few seconds is about three times faster (measured on
// recitation audio with the Tarteel base model, same text out). Nothing else in the package changes.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../node_modules/whisper.rn/cpp/jsi/RNWhisperJSI.cpp', import.meta.url);
if (!existsSync(file)) process.exit(0);
const src = readFileSync(file, 'utf8');
if (src.includes('encoder window in 20 ms frames')) process.exit(0);
const anchor = '    config.params.greedy.best_of =\n        getIntProperty(runtime, options, "bestOf", config.params.greedy.best_of);';
if (!src.includes(anchor)) {
  console.warn('patch-whisper: anchor not found (whisper.rn changed?); audioCtx not added');
  process.exit(0);
}
const add = '\n    // encoder window in 20 ms frames (0 = the full 30 s): short audio encodes several times faster\n    config.params.audio_ctx = getIntProperty(runtime, options, "audioCtx", config.params.audio_ctx);';
writeFileSync(file, src.replace(anchor, anchor + add));
console.log('patch-whisper: audioCtx added');
