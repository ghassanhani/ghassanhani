# Training the recitation model (تدريب نموذج التسميع)

**Why.** The app's speech model (`tarteel-ai/whisper-base-ar-quran`) was trained only on correct
recitation. When a reciter says a wrong word in an ayah it knows, it tends to write the ayah as it
remembers it, so the slip is never seen. Here it is fine-tuned on correct ayat **and** the same ayat
with a mistake cut into the audio (a word dropped, replaced, swapped or repeated), labelled with what
is actually in the sound. It keeps reading correct recitation and learns to write what was said.

**Decisions (founder, 2026-11-15).** Train on the founder's Mac (M5 Pro), free. Data: the Tarteel
«everyayah» dataset on Hugging Face (its licence is not clearly documented; the data stays on the
Mac and is never redistributed; only the trained weights go into the app). The original
`openai/whisper-base` (MIT) is used as a tool to find word positions; it is not shipped.

## On the Mac

```
cd ~/maknoon-app/maknoon
git pull
bash pipeline/train/run.sh --trial     # half an hour: checks that everything works on this Mac
bash pipeline/train/run.sh             # the real run: leave it overnight
```

- Needs about 30 GB of free disk for the real run (dataset files are deleted as they are used).
- It prints «about N h left» while training. Stop with Ctrl-C at any time and run the same command
  again: it continues.
- When it ends it prints three kinds of lines to send back:
  `before training → …`, `after epoch N → …`, and the size and SHA-256 of the phone file
  `pipeline/raw/train/ggml-maknoon-base-ar-quran-q5_1.bin`.

## Reading the numbers

| number | meaning | want |
|---|---|---|
| clean WER | word errors on correct recitation | not higher than before training |
| closer to what was said | planted mistakes it wrote as said | much higher than before |
| closer to the ayah from memory | planted mistakes it "corrected" | near 0 |

The model is only put in the app after it is also run through the replay test of the listening
loop (false red words on correct recitation, planted slips caught) and compared with the current one.

## Files

- `1_prepare.py` downloads recordings, finds each word in the audio, plants one mistake per ayah
- `2_train.py` fine-tunes and measures after every epoch; keeps the best epoch
- `3_export.sh` converts the best epoch to the phone's GGML file (`pipeline/models/whisper_to_ggml.py`)
- everything generated lives in `pipeline/raw/train/` (never committed)

Checked before hand-over (on a small sample, on a CPU): the three steps run end to end and the
exported file loads in whisper.cpp and reads a recitation. Not checked: speed and memory on the Mac's
GPU (MPS), and whether the full run improves the model; that is what the numbers above will say.
