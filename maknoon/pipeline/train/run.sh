#!/usr/bin/env bash
# Everything in one go, on the Mac:   bash pipeline/train/run.sh            (about 50 h of recitation)
# A quick trial first (half an hour):  bash pipeline/train/run.sh --trial
# Safe to stop (Ctrl-C) and run again: each step continues where it stopped.
set -euo pipefail
cd "$(dirname "$0")/../.."
HOURS=50; VAL=1.5; EPOCHS=3
if [ "${1:-}" = "--trial" ]; then HOURS=1; VAL=0.2; EPOCHS=1; fi

VENV=pipeline/raw/train/venv
if [ ! -x "$VENV/bin/python" ]; then
  mkdir -p pipeline/raw/train
  # Python 3.10 or newer (the Mac's own python3 can be older): brew install python@3.12
  PY=""; for c in python3.13 python3.12 python3.11 python3.10 python3; do
    if command -v $c >/dev/null && $c -c 'import sys; sys.exit(sys.version_info < (3, 10))'; then PY=$c; break; fi
  done
  [ -n "$PY" ] || { echo "Python 3.10+ is needed:  brew install python@3.12"; exit 1; }
  $PY -m venv "$VENV"
  "$VENV/bin/pip" install --quiet --upgrade pip
  "$VENV/bin/pip" install --quiet -r pipeline/train/requirements.txt
fi
export PYTORCH_ENABLE_MPS_FALLBACK=1 HF_HUB_DISABLE_XET=1 TOKENIZERS_PARALLELISM=false
# the Mac must not sleep while this runs
KEEP=""; command -v caffeinate >/dev/null && KEEP="caffeinate -i"

echo "== 1/3  recordings, word timings, planted mistakes (${HOURS} h)"
$KEEP "$VENV/bin/python" pipeline/train/1_prepare.py --hours "$HOURS" --val-hours "$VAL"
echo "== 2/3  training (${EPOCHS} epochs)"
RESUME=""; [ -f pipeline/raw/train/checkpoint/state.json ] && RESUME="--resume"
$KEEP "$VENV/bin/python" pipeline/train/2_train.py --epochs "$EPOCHS" $RESUME
echo "== 3/3  the phone's file"
PATH="$PWD/$VENV/bin:$PATH" bash pipeline/train/3_export.sh
echo
echo "Done. Send Claude the lines that start with «before training» and «after epoch», and the last lines above."
