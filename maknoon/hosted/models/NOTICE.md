# ggml-tarteel-base-ar-quran-q5_1.bin

Speech-recognition model for Maknoon's recitation check (تسميع), downloaded by the app on demand.

- **Original:** `tarteel-ai/whisper-base-ar-quran` (Hugging Face), © Tarteel AI, licensed under the
  Apache License 2.0 (copy in `LICENSE-Apache-2.0.txt`).
- **Changes:** the published PyTorch weights were converted to the GGML format used by whisper.cpp
  (whisper.cpp's `models/convert-h5-to-ggml.py`, with the text context set to the model's own
  `max_target_positions` = 448) and quantized to q5_1 with whisper.cpp's `whisper-quantize`.
  The weights were not retrained or otherwise changed.
- **Size / SHA-256:** 59,707,625 bytes ·
  `acc1f03c8b1468b674b4fab50e0b2312cff982ba0001cd16fe36ca23862b6536`
- **Checked:** transcribes RATQ recitations of al-Fatiha (two reciters) and al-Ikhlas correctly
  apart from small slips, which the app's matching tolerates.
