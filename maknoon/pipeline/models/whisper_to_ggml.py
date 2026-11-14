#!/usr/bin/env python3
"""
Hugging Face Whisper weights -> the GGML file whisper.cpp / whisper.rn load on the phone, quantized
to q5_1. A self-contained port of whisper.cpp's models/convert-h5-to-ggml.py followed by its
examples/quantize (q5_1), using numpy only (no torch, no compiled tools):

  python3 -I pipeline/models/whisper_to_ggml.py <hf model dir> <reference ggml file> <out.bin>

  · weights: model.safetensors, or pytorch_model.bin read as data (the pickle is restricted to
    tensor rebuilding; nothing else in it is ever executed)
  · mel filters: copied from the reference GGML file (an official conversion with the same number
    of mel bins), so no other download is needed
  · verification: run once with the model the reference was made from; `--compare` then checks
    the result is byte-for-byte the official file (header, mel filters, vocabulary, every tensor)

The weights are converted and quantized, never retrained.
"""
import json
import pickle
import struct
import sys
import zipfile
from pathlib import Path

import numpy as np

CONV_MAP = {
    'self_attn.k_proj': 'attn.key', 'self_attn.q_proj': 'attn.query', 'self_attn.v_proj': 'attn.value',
    'self_attn.out_proj': 'attn.out', 'self_attn_layer_norm': 'attn_ln',
    'encoder_attn.q_proj': 'cross_attn.query', 'encoder_attn.v_proj': 'cross_attn.value',
    'encoder_attn.out_proj': 'cross_attn.out', 'encoder_attn_layer_norm': 'cross_attn_ln',
    'fc1': 'mlp.0', 'fc2': 'mlp.2', 'final_layer_norm': 'mlp_ln',
    'encoder.layer_norm.bias': 'encoder.ln_post.bias', 'encoder.layer_norm.weight': 'encoder.ln_post.weight',
    'encoder.embed_positions.weight': 'encoder.positional_embedding',
    'decoder.layer_norm.bias': 'decoder.ln.bias', 'decoder.layer_norm.weight': 'decoder.ln.weight',
    'decoder.embed_positions.weight': 'decoder.positional_embedding',
    'decoder.embed_tokens.weight': 'decoder.token_embedding.weight', 'proj_out.weight': 'decoder.proj.weight',
}
SKIP_QUANT = {'encoder.conv1.bias', 'encoder.conv2.bias', 'encoder.positional_embedding', 'decoder.positional_embedding'}
GGML_TYPE_F32, GGML_TYPE_F16, GGML_TYPE_Q5_1 = 0, 1, 7
FTYPE_Q5_1 = 2 * 1000 + 9  # GGML_QNT_VERSION * GGML_QNT_VERSION_FACTOR + GGML_FTYPE_MOSTLY_Q5_1


def bytes_to_unicode():
    bs = list(range(ord('!'), ord('~') + 1)) + list(range(ord('¡'), ord('¬') + 1)) + list(range(ord('®'), ord('ÿ') + 1))
    cs = bs[:]
    n = 0
    for b in range(256):
        if b not in bs:
            bs.append(b)
            cs.append(256 + n)
            n += 1
    return dict(zip(bs, [chr(c) for c in cs]))


# ---------- reading weights (as data only) ----------

def read_safetensors(path):
    raw = Path(path).read_bytes()
    n = struct.unpack('<Q', raw[:8])[0]
    head = json.loads(raw[8:8 + n])
    base = 8 + n
    dt = {'F32': np.float32, 'F16': np.float16, 'BF16': None}
    out = {}
    for name, info in head.items():
        if name == '__metadata__':
            continue
        a, b = info['data_offsets']
        buf = raw[base + a:base + b]
        if info['dtype'] == 'BF16':
            u = np.frombuffer(buf, dtype=np.uint16).astype(np.uint32) << 16
            arr = u.view(np.float32)
        else:
            arr = np.frombuffer(buf, dtype=dt[info['dtype']])
        out[name] = arr.reshape(info['shape']).astype(np.float32)
    return out


class _Storage:
    def __init__(self, dtype, key):
        self.dtype, self.key = dtype, key


def read_torch_bin(path):
    """torch.save zip, read as data: only tensor rebuilding is allowed in the pickle."""
    z = zipfile.ZipFile(path)
    prefix = z.namelist()[0].split('/')[0]
    dtypes = {'FloatStorage': np.float32, 'HalfStorage': np.float16, 'DoubleStorage': np.float64, 'LongStorage': np.int64, 'IntStorage': np.int32}

    def rebuild(storage, offset, size, stride, *_):
        data = np.frombuffer(z.read(f'{prefix}/data/{storage.key}'), dtype=storage.dtype)
        if not size:
            return data[offset:offset + 1].reshape(()).astype(np.float32)
        item = data.itemsize
        arr = np.lib.stride_tricks.as_strided(data[offset:], shape=tuple(size), strides=tuple(s * item for s in stride))
        return np.array(arr, dtype=np.float32)

    class Restricted(pickle.Unpickler):
        def find_class(self, module, name):
            if module == 'torch._utils' and name == '_rebuild_tensor_v2':
                return rebuild
            if module == 'collections' and name == 'OrderedDict':
                import collections
                return collections.OrderedDict
            if module == 'torch' and name in dtypes:
                return name
            raise pickle.UnpicklingError(f'refused: {module}.{name}')

        def persistent_load(self, pid):
            _, kind, key, _loc, _n = pid
            return _Storage(dtypes[kind], key)

    return dict(Restricted(z.open(f'{prefix}/data.pkl')).load())


def load_weights(d):
    d = Path(d)
    if (d / 'model.safetensors').exists():
        return read_safetensors(d / 'model.safetensors')
    return read_torch_bin(d / 'pytorch_model.bin')


# ---------- the order transformers' state_dict() gives (the official script writes in it) ----------

def state_order(cfg, names):
    order = []
    enc = ['model.encoder.conv1.weight', 'model.encoder.conv1.bias', 'model.encoder.conv2.weight', 'model.encoder.conv2.bias', 'model.encoder.embed_positions.weight']
    order += enc
    block = lambda p, cross: [f'{p}.self_attn.k_proj.weight', f'{p}.self_attn.v_proj.weight', f'{p}.self_attn.v_proj.bias', f'{p}.self_attn.q_proj.weight', f'{p}.self_attn.q_proj.bias', f'{p}.self_attn.out_proj.weight', f'{p}.self_attn.out_proj.bias', f'{p}.self_attn_layer_norm.weight', f'{p}.self_attn_layer_norm.bias'] + (
        [f'{p}.encoder_attn.k_proj.weight', f'{p}.encoder_attn.v_proj.weight', f'{p}.encoder_attn.v_proj.bias', f'{p}.encoder_attn.q_proj.weight', f'{p}.encoder_attn.q_proj.bias', f'{p}.encoder_attn.out_proj.weight', f'{p}.encoder_attn.out_proj.bias', f'{p}.encoder_attn_layer_norm.weight', f'{p}.encoder_attn_layer_norm.bias'] if cross else []
    ) + [f'{p}.fc1.weight', f'{p}.fc1.bias', f'{p}.fc2.weight', f'{p}.fc2.bias', f'{p}.final_layer_norm.weight', f'{p}.final_layer_norm.bias']
    for i in range(cfg['encoder_layers']):
        order += block(f'model.encoder.layers.{i}', False)
    order += ['model.encoder.layer_norm.weight', 'model.encoder.layer_norm.bias', 'model.decoder.embed_tokens.weight', 'model.decoder.embed_positions.weight']
    for i in range(cfg['decoder_layers']):
        order += block(f'model.decoder.layers.{i}', True)
    order += ['model.decoder.layer_norm.weight', 'model.decoder.layer_norm.bias']
    missing = [n for n in order if n not in names]
    extra = [n for n in names if n not in order and n != 'proj_out.weight']
    if missing or extra:
        raise SystemExit(f'unexpected weights: missing {missing[:5]} extra {extra[:5]}')
    return order


def ggml_name(name):
    nn = name.split('.')[1:]
    if nn[1] == 'layers':
        nn[1] = 'blocks'
        key = '.'.join(nn[3:-1])
        mapped = ('attn.key' if nn[0] == 'encoder' else 'cross_attn.key') if key == 'encoder_attn.k_proj' else CONV_MAP[key]
        return '.'.join(nn[:3] + [mapped] + nn[-1:])
    n = '.'.join(nn)
    return CONV_MAP.get(n, n)


# ---------- q5_1, as ggml's quantize_row_q5_1_ref (float32 arithmetic) ----------

def q5_1(x):
    x = x.astype(np.float32).reshape(-1, 32)
    mn = x.min(axis=1)
    mx = x.max(axis=1)
    d = ((mx - mn) / np.float32(31)).astype(np.float32)
    with np.errstate(divide='ignore'):
        idd = np.where(d != 0, np.float32(1) / d, np.float32(0)).astype(np.float32)
    q = ((x - mn[:, None]) * idd[:, None] + np.float32(0.5)).astype(np.float32)
    q = np.trunc(q).astype(np.int64).astype(np.uint8)
    lo, hi = q[:, :16], q[:, 16:]
    qs = (lo & 0x0F) | ((hi & 0x0F) << 4)
    bits = np.concatenate([(lo >> 4) & 1, (hi >> 4) & 1], axis=1).astype(np.uint32)
    qh = (bits << np.arange(32, dtype=np.uint32)).sum(axis=1, dtype=np.uint64).astype('<u4')
    out = np.zeros((x.shape[0], 24), dtype=np.uint8)
    out[:, 0:2] = d.astype('<f2').view(np.uint8).reshape(-1, 2)
    out[:, 2:4] = mn.astype('<f2').view(np.uint8).reshape(-1, 2)
    out[:, 4:8] = qh.view(np.uint8).reshape(-1, 4)
    out[:, 8:24] = qs
    return out.tobytes()


# ---------- reading a GGML whisper file (for the mel filters and the comparison) ----------

def read_ggml(path):
    b = Path(path).read_bytes()
    o = 0

    def i32():
        nonlocal o
        v = struct.unpack_from('<i', b, o)[0]
        o += 4
        return v

    assert i32() == 0x67676D6C
    hp = [i32() for _ in range(11)]
    n_mel, n_fft = i32(), i32()
    mel = b[o:o + 4 * n_mel * n_fft]
    o += len(mel)
    n_tok = i32()
    toks = []
    for _ in range(n_tok):
        L = i32()
        toks.append(b[o:o + L])
        o += L
    tensors = {}
    sizes = {GGML_TYPE_F32: 4, GGML_TYPE_F16: 2}
    while o < len(b):
        nd, L, t = i32(), i32(), i32()
        ne = [i32() for _ in range(nd)]
        name = b[o:o + L].decode()
        o += L
        n = int(np.prod(ne))
        size = n * sizes[t] if t in sizes else n // 32 * 24
        tensors[name] = (t, ne, b[o:o + size])
        o += size
    return {'hp': hp, 'n_mel': n_mel, 'n_fft': n_fft, 'mel': mel, 'tokens': toks, 'tensors': tensors}


def convert(model_dir, ref_path, out_path):
    d = Path(model_dir)
    cfg = json.loads((d / 'config.json').read_text())
    vocab = json.loads((d / 'vocab.json').read_text(encoding='utf8'))
    ref = read_ggml(ref_path)
    if ref['n_mel'] != cfg['num_mel_bins']:
        raise SystemExit('the reference file has another number of mel bins')
    w = load_weights(d)
    out = bytearray()
    p = lambda fmt, *v: out.extend(struct.pack(fmt, *v))
    p('<i', 0x67676D6C)
    for v in [cfg['vocab_size'], cfg['max_source_positions'], cfg['d_model'], cfg['encoder_attention_heads'], cfg['encoder_layers'],
              cfg['max_target_positions'], cfg['d_model'], cfg['decoder_attention_heads'], cfg['decoder_layers'], cfg['num_mel_bins'], FTYPE_Q5_1]:
        p('<i', v)
    p('<i', ref['n_mel'])
    p('<i', ref['n_fft'])
    out.extend(ref['mel'])
    dec = {v: k for k, v in bytes_to_unicode().items()}
    p('<i', len(vocab))
    for tok, _ in sorted(vocab.items(), key=lambda x: x[1]):
        t = bytes(dec[c] for c in tok)
        p('<i', len(t))
        out.extend(t)
    for src in state_order(cfg, w.keys()):
        name = ggml_name(src)
        data = np.squeeze(w[src]).astype(np.float16)
        if name in ('encoder.conv1.bias', 'encoder.conv2.bias'):
            data = data.reshape(data.shape[0], 1)
        nd = data.ndim
        f32 = nd < 2 or name in SKIP_QUANT
        quant = nd == 2 and name not in SKIP_QUANT
        enc = name.encode()
        ttype = GGML_TYPE_Q5_1 if quant else (GGML_TYPE_F32 if f32 else GGML_TYPE_F16)
        p('<iii', nd, len(enc), ttype)
        for i in range(nd):
            p('<i', data.shape[nd - 1 - i])
        out.extend(enc)
        if quant:
            out.extend(q5_1(data.astype(np.float32)))
        elif f32:
            out.extend(data.astype('<f4').tobytes())
        else:
            out.extend(data.astype('<f2').tobytes())
    Path(out_path).write_bytes(bytes(out))
    return out_path


def compare(a_path, b_path):
    a, b = read_ggml(a_path), read_ggml(b_path)
    problems = []
    if a['hp'] != b['hp']:
        problems.append(f"hparams {a['hp']} != {b['hp']}")
    if a['mel'] != b['mel']:
        problems.append('mel filters differ')
    if a['tokens'] != b['tokens']:
        problems.append(f"vocabulary differs ({len(a['tokens'])} vs {len(b['tokens'])})")
    if set(a['tensors']) != set(b['tensors']):
        problems.append('tensor names differ')
    diff = 0
    for n in a['tensors']:
        if n not in b['tensors']:
            continue
        ta, tb = a['tensors'][n], b['tensors'][n]
        if ta[0] != tb[0] or ta[1] != tb[1]:
            problems.append(f'{n}: type/shape {ta[:2]} != {tb[:2]}')
        elif ta[2] != tb[2]:
            diff += 1
            if diff <= 5:
                x, y = np.frombuffer(ta[2], np.uint8), np.frombuffer(tb[2], np.uint8)
                problems.append(f'{n}: {(x != y).sum()} of {x.size} bytes differ')
    same = Path(a_path).read_bytes() == Path(b_path).read_bytes()
    return same, diff, problems


if __name__ == '__main__':
    if sys.argv[1] == '--compare':
        same, diff, problems = compare(sys.argv[2], sys.argv[3])
        print('IDENTICAL, byte for byte' if same else f'differs: {diff} tensors with different bytes')
        for x in problems:
            print('  ·', x)
        sys.exit(0 if same else 1)
    convert(sys.argv[1], sys.argv[2], sys.argv[3])
    print('written', sys.argv[3])
