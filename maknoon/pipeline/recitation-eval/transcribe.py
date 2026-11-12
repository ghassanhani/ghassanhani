#!/usr/bin/env python3
"""Transcribe the deliberate-mistake recordings with tarteel-ai/whisper-base-ar-quran.

Reads  pipeline/raw/recitation-eval/cases.json
Writes pipeline/raw/recitation-eval/heard.json   { "<file>": "<what the model heard>" }
Audio stays on this machine.
"""
import json
from pathlib import Path

from transformers import pipeline

root = Path(__file__).resolve().parents[2] / "pipeline" / "raw" / "recitation-eval"
cases = json.loads((root / "cases.json").read_text(encoding="utf-8"))
asr = pipeline("automatic-speech-recognition", model="tarteel-ai/whisper-base-ar-quran", chunk_length_s=25)
heard = {}
for case in cases:
    heard[case["file"]] = asr(str(root / case["file"]))["text"]
    print(case["file"], "→", len(heard[case["file"]].split()), "words")
(root / "heard.json").write_text(json.dumps(heard, ensure_ascii=False, indent=1), encoding="utf-8")
