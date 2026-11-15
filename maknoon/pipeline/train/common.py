"""Shared by the training scripts: paths, the base model, text folding."""
import os
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'pipeline' / 'raw' / 'train'  # downloaded and generated data (never committed)
# the model the app ships; training starts from it (MAKNOON_BASE: a local copy of it instead)
BASE = os.environ.get('MAKNOON_BASE', 'tarteel-ai/whisper-base-ar-quran')
DATASET = 'tarteel-ai/everyayah'  # founder decision 2026-11-15: used for training (data stays on this machine)
RATE = 16000
# The original Whisper base (MIT), used only to find where each word is in the audio: the Tarteel
# fine-tune no longer tracks time. Its cross-attention heads that follow the audio:
ALIGNER = 'openai/whisper-base'
ALIGNMENT_HEADS = [[3, 1], [4, 2], [4, 3], [4, 7], [5, 1], [5, 2], [5, 4], [5, 6]]


def fold(text: str) -> str:
    """Letters only, for comparing a reading with the text: no tashkeel or Quranic marks, one hamza seat."""
    t = ''.join(c for c in unicodedata.normalize('NFKD', text) if not unicodedata.combining(c))
    t = re.sub('[ـۖ-ۭ]', '', t)  # tatweel, Quranic annotation signs
    t = re.sub('[آأإٱ]', 'ا', t).replace('ى', 'ي').replace('ة', 'ه')
    return re.sub(r'\s+', ' ', t).strip()


def device():
    import torch

    if torch.backends.mps.is_available():
        return 'mps'
    return 'cuda' if torch.cuda.is_available() else 'cpu'
