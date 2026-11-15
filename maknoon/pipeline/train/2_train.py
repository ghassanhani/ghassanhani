#!/usr/bin/env python3
"""
Step 2 — fine-tune the app's recitation model on clean ayat and their planted-mistake twins.

  python pipeline/train/2_train.py            # a night on an Apple-silicon Mac
  python pipeline/train/2_train.py --resume   # continue after a stop

It starts from the model the app ships (tarteel-ai/whisper-base-ar-quran) with a small learning
rate, so it keeps what it knows and unlearns one habit: completing an ayah from memory when the
reciter said something else. After every epoch it measures, on recordings it never trained on:
    clean WER      word error rate on correct recitation (must not get worse)
    said           of planted mistakes, how often what it wrote is closer to what was actually
                   said than to the ayah as written (word edit distance)
    from memory    how often it is closer to the ayah as written (the habit to unlearn)
    mistake WER    word error rate against what was actually said
The best epoch (highest said rate, clean WER within 1 point of the best) is saved to
pipeline/raw/train/model/, ready for 3_export.sh.
"""
import argparse
import json
import math
import random
import re
import shutil
import sys
import time
from pathlib import Path

import jiwer
import numpy as np
import soundfile as sf
import torch
from huggingface_hub import hf_hub_download
from transformers import WhisperForConditionalGeneration, WhisperProcessor

sys.path.insert(0, str(Path(__file__).parent))
from common import BASE, RATE, RAW, device, fold  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--epochs', type=int, default=3)
ap.add_argument('--batch', type=int, default=16)
ap.add_argument('--lr', type=float, default=1e-5)
ap.add_argument('--resume', action='store_true')
ap.add_argument('--limit', type=int, default=0, help='use only this many training rows (a quick trial)')
ap.add_argument('--val-limit', type=int, default=400)
ap.add_argument('--seed', type=int, default=7)
args = ap.parse_args()
random.seed(args.seed)
torch.manual_seed(args.seed)

dev = device()
OUT, CKPT = RAW / 'model', RAW / 'checkpoint'
rows = [json.loads(line) for line in open(RAW / 'train.jsonl')]
val = [json.loads(line) for line in open(RAW / 'val.jsonl')]
if args.limit:
    rows = rows[: args.limit]
val = val[: args.val_limit]
print(f'device {dev} · {len(rows)} training recordings ({sum(r["kind"] != "clean" for r in rows)} with a planted mistake) · {len(val)} for measuring')

processor = WhisperProcessor.from_pretrained(BASE)
tok = processor.tokenizer
start_epoch, best = 0, None
if args.resume and (CKPT / 'state.json').exists():
    st = json.loads((CKPT / 'state.json').read_text())
    start_epoch, best = st['epoch'], st.get('best')
    model = WhisperForConditionalGeneration.from_pretrained(CKPT)
    print(f'resuming after epoch {start_epoch}')
else:
    model = WhisperForConditionalGeneration.from_pretrained(BASE)
model.to(dev)
PREFIX = tok.convert_tokens_to_ids(['<|ar|>', '<|transcribe|>', '<|notimestamps|>'])


def vocabulary(to: Path):
    """The base model's vocabulary files beside the weights: the converter to the phone's format reads them."""
    for name in ('vocab.json', 'added_tokens.json'):
        src = Path(BASE) / name if Path(BASE).is_dir() else Path(hf_hub_download(BASE, name))
        shutil.copyfile(src, to / name)


def load(r):
    a, sr = sf.read(RAW / r['audio'], dtype='float32')
    assert sr == RATE
    return a


def batch_of(rs):
    feats = processor([load(r) for r in rs], sampling_rate=RATE, return_tensors='pt').input_features
    # what the phone's decoder is given, then the words, then the end: <|ar|><|transcribe|><|notimestamps|> … <|endoftext|>
    # (the start token is added by the model itself)
    seqs = [PREFIX + tok.encode(r['text'], add_special_tokens=False) + [tok.eos_token_id] for r in rs]
    width = max(len(q) for q in seqs)
    ids = torch.tensor([q + [-100] * (width - len(q)) for q in seqs])
    return feats.to(dev), ids.to(dev)


@torch.no_grad()
def read(rs):
    model.eval()
    feats = processor([load(r) for r in rs], sampling_rate=RATE, return_tensors='pt').input_features.to(dev)
    out = model.generate(feats, max_new_tokens=200, num_beams=1, do_sample=False)
    return [re.sub(r'<\|[^|]*\|>', ' ', t).strip() for t in tok.batch_decode(out, skip_special_tokens=True)]


def measure():
    hyp = []
    for i in range(0, len(val), args.batch):
        hyp += read(val[i : i + args.batch])
    clean = [(fold(r['text']), fold(h)) for r, h in zip(val, hyp) if r['kind'] == 'clean']
    planted = [(r, fold(h)) for r, h in zip(val, hyp) if r['kind'] != 'clean']
    wer = jiwer.wer([c[0] for c in clean], [c[1] or '-' for c in clean]) if clean else float('nan')
    d = [(jiwer.wer(fold(r['text']), h or '-'), jiwer.wer(fold(r['was']), h or '-')) for r, h in planted]
    said = sum(a < b for a, b in d) / max(1, len(d))
    recalled = sum(b < a for a, b in d) / max(1, len(d))
    mwer = jiwer.wer([fold(r['text']) for r, _ in planted], [h or '-' for _, h in planted]) if planted else float('nan')
    return {'clean_wer': round(wer * 100, 2), 'said': round(said * 100, 1), 'recalled': round(recalled * 100, 1), 'mistake_wer': round(mwer * 100, 2), 'planted': len(planted)}


def say(m):
    return f"clean WER {m['clean_wer']}% · planted mistakes ({m['planted']}): closer to what was said {m['said']}%, closer to the ayah from memory {m['recalled']}%, WER against what was said {m['mistake_wer']}%"


if start_epoch == 0:
    m0 = measure()
    print('before training   →', say(m0), flush=True)
    RAW.joinpath('before.json').write_text(json.dumps(m0))

opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
steps_per_epoch = math.ceil(len(rows) / args.batch)
total = steps_per_epoch * args.epochs
warm = min(200, total // 10)
sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1.0, (s + 1) / max(1, warm)) * max(0.05, 1 - s / max(1, total)))
for _ in range(start_epoch * steps_per_epoch):
    sched.step()

for epoch in range(start_epoch, args.epochs):
    model.train()
    order = rows[:]
    random.Random(args.seed + epoch).shuffle(order)
    t0, run = time.time(), 0.0
    for step in range(steps_per_epoch):
        feats, labels = batch_of(order[step * args.batch : (step + 1) * args.batch])
        loss = model(input_features=feats, labels=labels).loss
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()
        sched.step()
        opt.zero_grad(set_to_none=True)
        run = loss.item() if step == 0 else 0.98 * run + 0.02 * loss.item()
        if step % 20 == 19 or step == steps_per_epoch - 1:
            per = (time.time() - t0) / (step + 1)
            left = per * (steps_per_epoch - step - 1 + (args.epochs - epoch - 1) * steps_per_epoch)
            print(f'epoch {epoch + 1}/{args.epochs} · step {step + 1}/{steps_per_epoch} · loss {run:.3f} · about {left / 3600:.1f} h left', flush=True)
    m = measure()
    print(f'after epoch {epoch + 1}   →', say(m), flush=True)
    better = best is None or (m['said'] > best['said'] and m['clean_wer'] <= best['clean_wer'] + 1.0) or (m['said'] == best['said'] and m['clean_wer'] < best['clean_wer'])
    if better:
        best = m
        model.save_pretrained(OUT, safe_serialization=True)
        processor.save_pretrained(OUT)
        vocabulary(OUT)
        (OUT / 'measured.json').write_text(json.dumps(m))
        print('  saved as the best so far →', OUT, flush=True)
    model.save_pretrained(CKPT, safe_serialization=True)
    (CKPT / 'state.json').write_text(json.dumps({'epoch': epoch + 1, 'best': best}))

print('\nfinished. best:', say(best) if best else 'none')
