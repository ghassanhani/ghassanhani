#!/usr/bin/env bash
# Converts tarteel-ai/whisper-base-ar-quran (Apache-2.0) to the GGML format whisper.cpp /
# whisper.rn load on a phone, quantizes it, and prints the size and SHA-256 to put in
# assets/models/manifest.json. Run on the founder's machine (needs Python 3, git, cmake, ~3 GB disk).
#
#   bash pipeline/models/convert-tarteel.sh
#
# The weights are converted and quantized, not retrained. Keep the Apache-2.0 notice with the file.
set -euo pipefail
WORK="${WORK:-$(mktemp -d)}"
OUT="$(cd "$(dirname "$0")/../.." && pwd)/pipeline/raw/models"
mkdir -p "$OUT"
cd "$WORK"

python3 -m venv venv && . venv/bin/activate
pip install --quiet torch transformers numpy huggingface_hub

git clone --depth 1 https://github.com/ggml-org/whisper.cpp
git clone --depth 1 https://github.com/openai/whisper
python - <<'PY'
from huggingface_hub import snapshot_download
snapshot_download("tarteel-ai/whisper-base-ar-quran", local_dir="tarteel")
PY

# 1 · Hugging Face weights → GGML (f16)
python whisper.cpp/models/convert-h5-to-ggml.py tarteel whisper .
# 2 · quantize (q5_1 keeps accuracy close to f16 at about 40% of the size)
cmake -S whisper.cpp -B whisper.cpp/build -DCMAKE_BUILD_TYPE=Release >/dev/null
cmake --build whisper.cpp/build --target quantize -j >/dev/null
QUANT="$(find whisper.cpp/build -type f -name 'quantize*' -perm -u+x | head -1)"
"$QUANT" ggml-model.bin "$OUT/ggml-tarteel-base-ar-quran-q5_1.bin" q5_1

cd "$OUT"
BYTES=$(wc -c < ggml-tarteel-base-ar-quran-q5_1.bin | tr -d ' ')
SHA=$( (sha256sum ggml-tarteel-base-ar-quran-q5_1.bin 2>/dev/null || shasum -a 256 ggml-tarteel-base-ar-quran-q5_1.bin) | cut -d' ' -f1)
echo
echo "Model:  $OUT/ggml-tarteel-base-ar-quran-q5_1.bin"
echo "bytes:  $BYTES"
echo "sha256: $SHA"
echo "Put both in assets/models/manifest.json, then upload the file to the packs host (expo.extra.packsBaseUrl)."
