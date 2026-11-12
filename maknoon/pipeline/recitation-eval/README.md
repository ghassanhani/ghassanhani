# Deliberate-mistake test set (SPEC §2.12, M10)

The model may "hear" the correct ayah even when the reciter erred, so before release we measure, on real
recordings, how many mistakes are caught and how many false alarms are raised.

## Recordings

Put WAV/MP3/M4A files in `pipeline/raw/recitation-eval/` with a `cases.json`:

```json
[
  { "file": "mulk-1-5-correct.wav", "ayat": ["67:1", "67:2", "67:3", "67:4", "67:5"], "mistakes": [] },
  { "file": "mulk-1-5-dropped.wav", "ayat": ["67:1", "67:2", "67:3", "67:4", "67:5"],
    "mistakes": [{ "ayah": "67:2", "kind": "missing" }] },
  { "file": "mulk-1-5-skipped.wav", "ayat": ["67:1", "67:2", "67:3", "67:4", "67:5"],
    "mistakes": [{ "ayah": "67:3", "kind": "skipped-ayah" }] }
]
```

`kind` is `missing`, `changed` or `skipped-ayah`. Record each portion once correctly and several times with one
planned mistake. A few different voices, a quiet room and a noisy one.

## Run

```bash
pip install torch transformers            # once
python pipeline/recitation-eval/transcribe.py     # model → pipeline/raw/recitation-eval/heard.json
npm run recitation:eval                           # matcher → catch rate and false-alarm rate
```

`transcribe.py` uses the published model through `transformers`, which is the same model the phone runs
after conversion. Re-check a sample on a phone build too, since quantization can change a few words.
