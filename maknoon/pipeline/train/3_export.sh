#!/usr/bin/env bash
# Step 3 — the trained model as the file the phone loads (GGML, q5_1), with its size and SHA-256.
#   bash pipeline/train/3_export.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
MODEL=pipeline/raw/train/model
OUT=pipeline/raw/train/ggml-maknoon-base-ar-quran-q5_1.bin
[ -f "$MODEL/model.safetensors" ] || { echo "No trained model in $MODEL (run 2_train.py first)"; exit 1; }
python3 -I pipeline/models/whisper_to_ggml.py "$MODEL" assets/models/ggml-tarteel-base-ar-quran-q5_1.bin "$OUT"
echo
ls -l "$OUT"
shasum -a 256 "$OUT" 2>/dev/null || sha256sum "$OUT"
echo
cat "$MODEL/measured.json"; echo
