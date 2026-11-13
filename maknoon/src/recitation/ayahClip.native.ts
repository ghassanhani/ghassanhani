import { Directory, File, Paths } from 'expo-file-system';

/**
 * One ayah as its own small audio file, cut from the surah file on RATQ's storage with an HTTP
 * range request: only the ayah's bytes are fetched (about 200 KB instead of a whole surah), so it
 * starts at once and can be fetched ahead (the ayah of the day). Kept in the cache folder; the
 * system may clear it at any time.
 *
 * The cut is exact only for constant-bitrate MP3 (RATQ's timed recitations are 128 kbps CBR):
 * the file's ID3 tag and first frame header are read first, and a variable-bitrate file (a "Xing"
 * header) or anything unexpected returns null, so the player falls back to streaming the surah.
 */
const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]; // MPEG-1 Layer III, kbps
const RATE = new Map<string, number>(); // sample rate per file
const head = new Map<string, Promise<{ audio: number; bytesPerMs: number } | null>>();

async function range(url: string, from: number, to: number) {
  const r = await fetch(url, { headers: { Range: `bytes=${from}-${to}` } });
  if (r.status !== 206) throw new Error(`range ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

/** Where the audio starts in the file and how many bytes a millisecond takes (CBR only). */
function layout(url: string) {
  let p = head.get(url);
  if (!p) {
    p = (async () => {
      const id = await range(url, 0, 9);
      const audio = id[0] === 0x49 && id[1] === 0x44 && id[2] === 0x33 ? 10 + ((id[6] << 21) | (id[7] << 14) | (id[8] << 7) | id[9]) : 0;
      // walk the first frames: their real lengths give the bytes per millisecond (encoders differ
      // in how often they pad a frame; assuming the standard average puts a long surah seconds off)
      const f = await range(url, audio, audio + 65535);
      if (String.fromCharCode(...f.slice(0, 200)).includes('Xing') || String.fromCharCode(...f.slice(0, 200)).includes('VBRI')) return null;
      let at = 0;
      let frames = 0;
      let rate = 0;
      while (at + 4 <= f.length) {
        if (f[at] !== 0xff || (f[at + 1] & 0xe0) !== 0xe0) return null; // lost the frame sync: not a plain MP3
        const mpeg1 = (f[at + 1] & 0x18) === 0x18;
        const layer3 = (f[at + 1] & 0x06) === 0x02;
        const kbps = BITRATES[f[at + 2] >> 4];
        const sr = [44100, 48000, 32000][(f[at + 2] >> 2) & 3];
        if (!mpeg1 || !layer3 || !kbps || !sr) return null;
        if (rate && (kbps !== rate || sr !== RATE.get(url))) return null; // the bitrate changes: VBR
        rate = kbps;
        RATE.set(url, sr);
        const len = Math.floor((144000 * kbps) / sr) + ((f[at + 2] >> 1) & 1);
        if (at + len > f.length) break;
        at += len;
        frames++;
      }
      if (frames < 50) return null;
      const frameMs = (1152 * 1000) / RATE.get(url)!;
      return { audio, bytesPerMs: at / frames / frameMs };
    })().catch(() => null);
    head.set(url, p);
  }
  return p;
}

const dir = () => {
  const d = new Directory(Paths.cache, 'ayat');
  if (!d.exists) d.create({ intermediates: true });
  return d;
};

const pending = new Map<string, Promise<string | null>>();

/** A local file holding just this ayah (`key` names it), or null when it cannot be cut exactly. */
export function ayahClip(url: string, key: string, startMs: number, endMs: number): Promise<string | null> {
  const file = new File(dir(), `${key}.mp3`);
  if (file.exists && file.size > 0) return Promise.resolve(file.uri);
  let p = pending.get(key);
  if (!p) {
    p = (async () => {
      const l = await layout(url);
      if (!l) return null;
      // a little before and after the timed ayah, so no breath or last letter is clipped
      const from = l.audio + Math.max(0, Math.floor((startMs - 60) * l.bytesPerMs));
      const to = l.audio + Math.ceil((endMs + 180) * l.bytesPerMs);
      const bytes = await range(url, from, to);
      file.write(bytes);
      return file.uri;
    })()
      .catch(() => null)
      .finally(() => pending.delete(key));
    pending.set(key, p);
  }
  return p;
}
