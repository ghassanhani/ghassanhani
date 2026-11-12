# Speech model for the recitation check (تسميع)

- **Model:** `tarteel-ai/whisper-base-ar-quran`, Apache-2.0 (confirmed by the founder on the model page, 2026-11-12).
- **On the phone:** whisper.cpp through `whisper.rn` (MIT). It needs the GGML format, so the published
  weights are converted and quantized. They are not retrained.
- **Convert:** `bash pipeline/models/convert-tarteel.sh`. It prints the file's size and SHA-256.
- **Publish:** put `bytes` and `sha256` in `assets/models/manifest.json`, upload the `.bin` to the packs
  host and set `expo.extra.packsBaseUrl` in `app.json`. Until then the app shows «لم يُنشر بعد».
- **Licence duties when it ships:** include the Apache-2.0 text, credit Tarteel, and state that the file
  was converted (the Settings credits already say so).
