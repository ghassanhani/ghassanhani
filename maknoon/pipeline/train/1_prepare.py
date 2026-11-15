#!/usr/bin/env python3
"""
Step 1 — data for training the recitation model to write what was SAID, not what it remembers.

  python pipeline/train/1_prepare.py --hours 50

· downloads ayah recordings from the Tarteel «everyayah» dataset, one 2 GB file at a time (about
  6 hours of recitation each, deleted once used), until it has `--hours`
· finds where each written word is in the audio (the original Whisper base is given the ayah's
  text and its attention is traced over the sound, DTW)
· from each kept ayah makes one recording with a planted mistake, by cutting the audio itself:
    drop     a word is removed            (the reciter skipped it)
    replace  a word is swapped for another word said by the same reciter
    swap     two neighbouring words change places
    repeat   a word is said twice
  The label of such a recording is the words actually in the audio.
· writes FLAC files and manifests (train.jsonl / val.jsonl) under pipeline/raw/train/

Resumable: run it again and it continues where it stopped.
"""
import argparse
import json
import random
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
import io

import librosa
import pyarrow.parquet as pq
from huggingface_hub import HfFileSystem, hf_hub_download
from transformers import WhisperForConditionalGeneration, WhisperProcessor

sys.path.insert(0, str(Path(__file__).parent))
from common import ALIGNER, ALIGNMENT_HEADS, DATASET, RATE, RAW, device, fold  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--hours', type=float, default=50, help='hours of clean recitation to collect')
ap.add_argument('--val-hours', type=float, default=1.5)
ap.add_argument('--max-seconds', type=float, default=24, help='longer ayat are skipped (a mistake adds audio; the model takes 30 s)')
ap.add_argument('--seed', type=int, default=7)
ap.add_argument('--keep-files', action='store_true', help='keep the downloaded dataset files (2 GB each) instead of deleting each once used')
ap.add_argument('--split', default='train', help='which part of the dataset to draw from')
args = ap.parse_args()
random.seed(args.seed)

RAW.mkdir(parents=True, exist_ok=True)
dev = device()
print(f'device: {dev}')
processor = WhisperProcessor.from_pretrained(ALIGNER)
model = WhisperForConditionalGeneration.from_pretrained(ALIGNER, attn_implementation='eager').to(dev).eval()
tok = processor.tokenizer
PREFIX = tok.convert_tokens_to_ids(['<|startoftranscript|>', '<|ar|>', '<|transcribe|>', '<|notimestamps|>'])


def dtw(cost: np.ndarray):
    """The cheapest monotonic path through text tokens × audio frames (each row computed at once)."""
    n, m = cost.shape
    D = np.full((n + 1, m + 1), np.inf, dtype=np.float64)
    D[0, 0] = 0
    for i in range(1, n + 1):
        c = cost[i - 1].astype(np.float64)
        t = np.minimum(D[i - 1, :-1], D[i - 1, 1:]) + c  # arriving from the row above
        # staying on the row: x[j] = min(t[j], x[j-1] + c[j]) — a running minimum once the costs are summed out
        C = np.cumsum(c)
        D[i, 1:] = np.minimum.accumulate(t - C) + C
    i, j, path = n, m, []
    while i > 0 and j > 0:
        path.append((i - 1, j - 1))
        k = int(np.argmin((D[i - 1, j - 1], D[i - 1, j], D[i, j - 1])))
        if k == 0:
            i, j = i - 1, j - 1
        elif k == 1:
            i -= 1
        else:
            j -= 1
    return path[::-1]


def word_times(audio: np.ndarray, ref: str):
    """[(word, start s, end s)] for the written words of `ref`, or None when a word cannot be placed."""
    words = ref.split()
    pieces = [tok.encode((' ' if k else '') + w, add_special_tokens=False) for k, w in enumerate(words)]
    ids = PREFIX + [t for p in pieces for t in p] + [tok.eos_token_id]
    if len(ids) > 440:
        return None
    feats = processor(audio, sampling_rate=RATE, return_tensors='pt').input_features.to(dev)
    with torch.no_grad():
        out = model(input_features=feats, decoder_input_ids=torch.tensor([ids], device=dev), output_attentions=True)
    frames = int(len(audio) / RATE * 50)  # the encoder's 20 ms frames that hold sound
    w = torch.stack([out.cross_attentions[layer][0, head] for layer, head in ALIGNMENT_HEADS])[:, len(PREFIX):-1, :frames].float().cpu()
    w = (w - w.mean(-2, keepdim=True)) / (w.std(-2, keepdim=True) + 1e-6)
    w = torch.nn.functional.avg_pool1d(w, 7, 1, 3)  # smoothed over 140 ms
    start: dict[int, int] = {}
    for ti, fi in dtw(-w.mean(0).numpy()):
        start.setdefault(ti, fi)
    out_words, t = [], 0
    for k, p in enumerate(pieces):
        s = start[t] / 50
        t += len(p)
        e = start[t] / 50 if t in start else frames / 50
        if not 0.08 <= e - s <= 8:
            return None
        out_words.append((words[k], float(s), float(e)))
    return out_words


def fade(x: np.ndarray, n=160):
    """10 ms fade in and out, so a cut does not click."""
    x = x.copy()
    n = min(n, len(x) // 2)
    if n > 0:
        ramp = np.linspace(0, 1, n, dtype=np.float32)
        x[:n] *= ramp
        x[-n:] *= ramp[::-1]
    return x


def cut(audio, s, e):
    return fade(audio[int(s * RATE):int(e * RATE)])


def plant(audio, words, bank):
    """One planted mistake: (new audio, the words now in it, kind) or None."""
    n = len(words)
    if n < 4:
        return None
    kind = random.choices(['drop', 'replace', 'swap', 'repeat'], weights=[4, 4, 1, 1])[0]
    k = random.randrange(1, n - 1)  # never the first or last word: its edges are the least sure
    seg = [cut(audio, s, e) for _, s, e in words]
    text = [w for w, _, _ in words]
    if kind == 'drop':
        del seg[k], text[k]
    elif kind == 'replace':
        cands = [b for b in bank if fold(b[0]) != fold(text[k]) and 0.5 < len(b[1]) / max(1, len(seg[k])) < 2]
        if not cands:
            return None
        w, a = random.choice(cands)
        seg[k], text[k] = a, w
    elif kind == 'swap':
        seg[k], seg[k + 1] = seg[k + 1], seg[k]
        text[k], text[k + 1] = text[k + 1], text[k]
    else:
        seg.insert(k, seg[k])
        text.insert(k, text[k])
    return np.concatenate(seg), ' '.join(text), kind


state_file = RAW / 'state.json'
state = json.loads(state_file.read_text()) if state_file.exists() else {'files': [], 'row': 0, 'n': 0, 'train_s': 0.0, 'val_s': 0.0, 'kept': 0, 'tried': 0}
(RAW / 'audio').mkdir(exist_ok=True)
banks: dict[str, list] = {}  # per reciter: words (text, audio) to swap in
train_f, val_f = open(RAW / 'train.jsonl', 'a'), open(RAW / 'val.jsonl', 'a')
target, vtarget = args.hours * 3600, args.val_hours * 3600
full = lambda: state['train_s'] >= target and state['val_s'] >= vtarget  # noqa: E731


def recordings():
    """Every recording of the dataset files not used yet, in a fixed random order of files: (audio, text, reciter)."""
    files = sorted(f.split('/', 3)[3] for f in HfFileSystem().glob(f'datasets/{DATASET}/data/{args.split}-*.parquet'))
    random.Random(args.seed).shuffle(files)
    for name in files:
        if name in state['files']:
            continue
        print(f'downloading {name} …', flush=True)
        path = hf_hub_download(DATASET, name, repo_type='dataset', local_dir=RAW / 'dataset')
        skip = state['row']
        # read a few rows at a time straight from the file: a whole block of it is a gigabyte in memory
        for batch in pq.ParquetFile(path, memory_map=True, pre_buffer=False).iter_batches(batch_size=4, columns=['audio', 'text', 'reciter'], use_threads=False):
            for ex in batch.to_pylist():
                if skip:
                    skip -= 1
                    continue
                state['row'] += 1
                try:
                    a, sr = sf.read(io.BytesIO(ex['audio']['bytes']), dtype='float32', always_2d=True)
                except Exception:
                    continue  # an unreadable recording
                a = a.mean(axis=1)
                yield (a if sr == RATE else librosa.resample(a, orig_sr=sr, target_sr=RATE)), ex['text'], ex['reciter']
                if full():
                    return
        state['files'].append(name)
        state['row'] = 0
        if not args.keep_files:
            Path(path).unlink(missing_ok=True)


for audio, ref, reciter in recordings():
    i = state['n'] = state['n'] + 1
    dur = len(audio) / RATE
    if not 1.5 <= dur <= args.max_seconds:
        continue
    state['tried'] += 1
    split = 'val' if state['val_s'] < vtarget and i % 20 == 0 else 'train'
    if split == 'train' and state['train_s'] >= target:
        continue
    ref = ref.strip()
    words = word_times(audio, ref)
    if not words:
        continue
    reciter = str(reciter or '?')
    bank = banks.setdefault(reciter, [])
    rows = [{'audio': f'audio/{i}.flac', 'text': ref, 'kind': 'clean', 'reciter': reciter, 'seconds': round(dur, 2)}]
    sf.write(RAW / rows[0]['audio'], audio, RATE)
    made = plant(audio, words, bank)
    if made:
        a, text, kind = made
        rows.append({'audio': f'audio/{i}-{kind}.flac', 'text': text, 'kind': kind, 'reciter': reciter, 'seconds': round(len(a) / RATE, 2), 'was': ref})
        sf.write(RAW / rows[1]['audio'], a, RATE)
    for w, s, e in words[1:-1]:
        if 0.25 <= e - s <= 2.5:
            bank.append((w, cut(audio, s, e)))
    del bank[:-400]
    f = val_f if split == 'val' else train_f
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + '\n')
    f.flush()
    state[f'{split}_s'] += dur
    state['kept'] += 1
    if state['kept'] % 25 == 0:
        state_file.write_text(json.dumps(state))
        print(f"kept {state['kept']} of {state['tried']} tried · train {state['train_s'] / 3600:.2f} h / {args.hours} h · val {state['val_s'] / 3600:.2f} h", flush=True)

state_file.write_text(json.dumps(state))
print(f"done: {state['kept']} ayat kept ({state['train_s'] / 3600:.1f} h train, {state['val_s'] / 3600:.1f} h val), each with a planted-mistake twin where one could be made")
