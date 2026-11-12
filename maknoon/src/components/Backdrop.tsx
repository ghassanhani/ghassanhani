import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

export type BackdropName = 'sand' | 'mint' | 'sea' | 'mist' | 'sky';

type Spec = {
  base: [string, string]; // diagonal gradient
  panel?: string; // tinted panel laid over the base (the canvas's 128px rounded frame)
  blobs: { color: string; opacity: number; cx: number; cy: number; rx: number; ry: number }[];
};

// Colours read from each screen's background layers on the canvas.
const specs: Record<BackdropName, Spec> = {
  sand: { base: ['#E3D8CE', '#E2E2E2'], blobs: [] },
  mint: {
    base: ['#F0E8E8', '#F0E8E8'],
    panel: '#CEEAD5',
    blobs: [
      { color: '#BADA47', opacity: 0.6, cx: 0.1, cy: 0.95, rx: 1.1, ry: 0.35 },
      { color: '#7FC57D', opacity: 0.45, cx: 1.05, cy: 0.75, rx: 0.5, ry: 0.35 },
    ],
  },
  sea: {
    base: ['#F0E8E8', '#F0E8E8'],
    panel: '#CEEAE6',
    blobs: [
      { color: '#47A1DA', opacity: 0.55, cx: 0.15, cy: 0.85, rx: 1.0, ry: 0.4 },
      { color: '#7DC1C5', opacity: 0.45, cx: 1.0, cy: 0.5, rx: 0.5, ry: 0.4 },
      { color: '#7FC57D', opacity: 0.25, cx: 0.9, cy: 1.0, rx: 0.5, ry: 0.2 },
    ],
  },
  mist: { base: ['#D3E4E2', '#D3E4E2'], blobs: [] },
  sky: {
    base: ['#E3D8CE', '#E2E2E2'],
    panel: '#CEDFEA',
    blobs: [
      { color: '#ACA711', opacity: 0.29, cx: 0.0, cy: 0.9, rx: 1.0, ry: 0.35 },
      { color: '#7FC57D', opacity: 0.35, cx: 0.0, cy: 0.35, rx: 0.5, ry: 0.3 },
      { color: '#7D93C5', opacity: 0.55, cx: 1.05, cy: 0.75, rx: 0.5, ry: 0.4 },
    ],
  },
};

/**
 * Fixed tinted gradient that sits behind scrolling content
 * (it does not move with the ScrollView).
 */
export function Backdrop({ name }: { name: BackdropName }) {
  const { width: w, height: h } = useWindowDimensions();
  const s = specs[name];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="bk-base" x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={s.base[0]} />
            <Stop offset="1" stopColor={s.base[1]} />
          </LinearGradient>
          <LinearGradient id="bk-top" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
            <Stop offset="0.12" stopColor="#FFFFFF" stopOpacity={0.12} />
            <Stop offset="0.3" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
          {s.blobs.map((b, i) => (
            <RadialGradient key={i} id={`bk-b${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={b.color} stopOpacity={b.opacity} />
              <Stop offset="0.5" stopColor={b.color} stopOpacity={b.opacity * 0.5} />
              <Stop offset="1" stopColor={b.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill="url(#bk-base)" />
        {s.panel ? <Rect x={0} y={0} width={w} height={h} fill={s.panel} /> : null}
        {s.blobs.map((b, i) => (
          <Ellipse key={i} cx={b.cx * w} cy={b.cy * h} rx={b.rx * w} ry={b.ry * h} fill={`url(#bk-b${i})`} />
        ))}
        {s.panel ? <Rect x={0} y={0} width={w} height={h} fill="url(#bk-top)" /> : null}
      </Svg>
    </View>
  );
}
