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

# ggml-small-ar-quran-q5_1.bin (served in two parts, .part0 and .part1)

The more accurate speech model for the recitation check (founder request 2026-11-14), an optional
download. The app downloads both parts, joins them and checks the whole file's SHA-256 before use.

- **Original:** `deepdml/whisper-small-ar-quran-mix-norm` (Hugging Face, revision
  `2d0929ee4d62cf3642e4184c16e9cb939d86ea78`, `model.safetensors` SHA-256
  `50e6b2a1264d78b2189874c7e87e029c8e124e05facebfd047a3f15c6dd1e272`), a fine-tune of
  `openai/whisper-small` on Quran recitations, licensed under the Apache License 2.0 (copy in
  `LICENSE-Apache-2.0.txt`). Reported word error rate 2.5% on its Quran test set.
- **Changes:** converted to the GGML format and quantized to q5_1 with
  `pipeline/models/whisper_to_ggml.py` (a numpy port of whisper.cpp's converter and q5_1 quantizer).
  The port was verified by converting `tarteel-ai/whisper-base-ar-quran` with it: the result is
  byte-for-byte identical to the file above, made with whisper.cpp's own tools. The weights were
  not retrained or otherwise changed.
- **Size / SHA-256:** 190,085,504 bytes ·
  `225f6fec1129050902d5d8d51cc9dca09a4e2815e14826b53508a6c82024361e`
  (part0: 95,000,000 bytes · `33d7cf2c80e45ca271cd93ebca2236a608eda2a5ccc1a6851cf504b3c463c30b`;
  part1: 95,085,504 bytes · `ba3aa259360359a162cb4fa68f45de627dfa3072ea24bdccc9942ec0a45b96bf`)

# assets/models/ggml-tarteel-base-ar-quran-q5_1.bin (bundled in the app)

The same file as `ggml-tarteel-base-ar-quran-q5_1.bin` above (59,707,625 bytes · SHA-256
`acc1f03c8b1468b674b4fab50e0b2312cff982ba0001cd16fe36ca23862b6536`), bundled so the recitation
check works without a download. It reads the words as they are recited; the accurate model, when
downloaded, re-reads finished phrases. (The tiny Tarteel model was tried for the live reading and
dropped: it missed and changed noticeably more words on recitation audio.)
