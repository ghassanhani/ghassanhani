import { useState } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { atStart, haptic, isRTL } from '@/components/motion';
import { Caption } from '@/components/Typography';
import { ar } from '@/content/quran';
import { seek, useProgress } from '@/recitation/player';

const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return ar(h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`);
};

/**
 * The recitation's timeline: elapsed and total time, a bar that fills from the start side (right
 * in Arabic) and a thumb you drag (or tap anywhere) to move through the surah. While dragging the
 * time follows the finger; the audio jumps when the finger lifts.
 */
export function Timeline({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { time, duration } = useProgress();
  const [w, setW] = useState(0);
  const [drag, setDrag] = useState<number | null>(null); // fraction while the finger is down
  const f = drag ?? (duration > 0 ? Math.min(1, time / duration) : 0);
  const rtl = isRTL();
  const c = tone === 'light' ? { track: 'rgba(255,255,255,0.22)', fill: '#FFFFFF', text: 'rgba(255,255,255,0.85)', dim: 'rgba(255,255,255,0.6)' } : { track: 'rgba(17,17,20,0.12)', fill: '#111114', text: '#111114', dim: 'rgba(17,17,20,0.55)' };

  // finger x (from the left edge) → fraction from the start side
  const at = (x: number) => {
    const p = Math.min(1, Math.max(0, x / Math.max(1, w)));
    return rtl ? 1 - p : p;
  };
  const begin = (x: number) => {
    haptic.select();
    setDrag(at(x));
  };
  const move = (x: number) => setDrag(at(x));
  const end = (x: number) => {
    const p = at(x);
    setDrag(null);
    if (duration > 0) seek(p * duration);
  };
  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => runOnJS(begin)(e.x))
    .onUpdate((e) => runOnJS(move)(e.x))
    .onFinalize((e) => runOnJS(end)(e.x));

  // the thumb's centre at f from the start side: native RTL mirrors `left` itself, the web does not
  const along = Platform.OS === 'web' && rtl ? (1 - f) * w : f * w;
  return (
    <View style={{ gap: 4 }}>
      <GestureDetector gesture={pan}>
        <View accessible accessibilityRole="adjustable" accessibilityLabel="موضع التلاوة" accessibilityValue={{ text: `${clock(time)} من ${clock(duration)}` }} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={styles.hit}>
          <View style={[styles.track, { backgroundColor: c.track }]}>
            <View style={[styles.fill, atStart(0), { width: `${f * 100}%`, backgroundColor: c.fill }]} />
          </View>
          {w ? <View style={[styles.thumb, { left: along - 8, backgroundColor: c.fill, transform: [{ scale: drag !== null ? 1.35 : 1 }] }]} /> : null}
        </View>
      </GestureDetector>
      <View style={styles.times}>
        <Caption color={c.text}>{clock(drag !== null ? drag * duration : time)}</Caption>
        <Caption color={c.dim}>{clock(duration)}</Caption>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 28, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 3 },
  thumb: { position: 'absolute', width: 16, height: 16, borderRadius: 8, top: 6 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
});
