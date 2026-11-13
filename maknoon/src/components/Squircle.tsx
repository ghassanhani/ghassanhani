import { type ReactNode, useId, useMemo, useState } from 'react';
import { Image, type LayoutChangeEvent, StyleSheet, View, type ViewProps, type ViewStyle, type StyleProp } from 'react-native';
import Svg, {
  Mask,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { type Blob } from '@/theme/tokens';

/** frost = glass + the wide faint light + grain: large glass cards only (icon bubbles stay glass). */
export type GlowStrength = 'none' | 'glass' | 'frost' | 'button';

// The canvas's frosted grain: a noise tile at 38 / 51.2 / 128 pt, 50% opacity, over every glass surface.
// Drawn as a natively repeated image (an SVG pattern of an image is slow to draw on phones).
const NOISE: Record<number, number> = {
  38: require('../../assets/brand/glass-noise-38.png'),
  51: require('../../assets/brand/glass-noise-51.png'),
  128: require('../../assets/brand/glass-noise-128.png'),
};
/** Native continuous corner radius per design radius (see `R` in Squircle). */
export const SMOOTH_K = 1; // the design's own radius (1.27 matched Figma's curve length but read too round)
const noiseTile = (n: number) => NOISE[n >= 100 ? 128 : n >= 45 ? 51 : 38];

export type SquircleProps = ViewProps & {
  radius: number;
  /** solid fill colour (rgba allowed) */
  fill?: string;
  /** horizontal gradient fill, RTL-agnostic [from, to] (left → right) */
  gradient?: [string, string];
  /** soft coloured light inside the shape (blur-50 ellipses in Figma) */
  blobs?: Blob[];
  /** inner glow recipe: glass cards, CTA buttons, or none */
  glow?: GlowStrength;
  /** grain tile size in pt (the canvas uses 38.4 on glass cards, 128 on hero cards) */
  noise?: number;
  /** stroke drawn on the squircle edge (inside the shape) */
  stroke?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * A box with Figma-style corner smoothing (94%). Shapes whose radius reaches
 * half their short side are pills/circles and stay fully round.
 *
 * Everything decorative is drawn in one SVG behind the children:
 * fill → tint blobs → inner glow (white inset light, as in the canvas CSS:
 * `inset 0 4px 14px 3px #fff/.65, inset 0 4px 4px #fff/.95, inset 0 -4px 4px #fff/.65`).
 */
export function Squircle({ radius, fill, gradient, blobs, glow = 'none', noise = 38, stroke, strokeWidth = 1, style, children, onLayout, ...rest }: SquircleProps) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || Math.abs(size.w - width) > 0.5 || Math.abs(size.h - height) > 0.5) setSize({ w: width, h: height });
    onLayout?.(e);
  };

  // The shape itself is native: Apple's continuous ("squircle") corner at the design's radius
  // (the founder found the longer, Figma-length curve too round). Fill, glow, grain and the
  // coloured lights are all clipped to this one shape, so every layer shares the same smooth corner.
  const R = useMemo(() => {
    const k = radius * SMOOTH_K;
    if (!size) return k;
    const half = Math.min(size.w, size.h) / 2;
    return radius >= half - 0.5 ? half : Math.min(half, k);
  }, [size, radius]);

  // On small round shapes (icon bubbles) the canvas glow is a thin rim; the card-sized band would wash the colour out.
  const small = !!size && Math.max(size.w, size.h) < 64;
  const g = glow === 'glass' || glow === 'frost' ? { wide: 0.65, top: 0.95, bottom: 0.65 } : glow === 'button' ? { wide: 0.35, top: 0.6, bottom: 0.35 } : null;

  return (
    <View
      {...rest}
      onLayout={handleLayout}
      style={[
        { borderRadius: R, borderCurve: 'continuous', overflow: 'hidden', zIndex: 0 },
        fill && !gradient && !(g && small) ? { backgroundColor: fill } : null,
        stroke ? { borderWidth: strokeWidth, borderColor: stroke } : null,
        style,
      ]}
    >
      {size ? (
        <View style={styles.bg} pointerEvents="none">
        {gradient || blobs?.length || (g && small && fill) ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            {gradient ? (
              <LinearGradient id={`f${uid}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={gradient[0]} />
                <Stop offset="1" stopColor={gradient[1]} />
              </LinearGradient>
            ) : null}
            {blobs?.map((b, i) =>
              b.blur ? (
                <G key={i}>
                  <BlurGradient id={`b${uid}${i}`} b={b} w={size.w} h={size.h} />
                  <BlurGradient id={`bs${uid}${i}`} b={{ ...b, blur: 2 }} w={size.w} h={size.h} />
                  {b.fade ? <FadeMask id={`${uid}${i}`} b={b} w={size.w} h={size.h} /> : null}
                </G>
              ) : (
              <RadialGradient key={i} id={`b${uid}${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor={b.color} stopOpacity={b.opacity ?? 1} />
                {/* a long, even falloff stands in for Figma's 50px blur */}
                <Stop offset="0.45" stopColor={b.color} stopOpacity={(b.opacity ?? 1) * 0.45} />
                <Stop offset="1" stopColor={b.color} stopOpacity={0} />
              </RadialGradient>
              ),
            )}
            {g && small && fill ? (
              <RadialGradient id={`e${uid}`} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor={fill} stopOpacity={0.92} />
                <Stop offset="0.72" stopColor={fill} stopOpacity={0.88} />
                <Stop offset="1" stopColor={fill} stopOpacity={0.45} />
              </RadialGradient>
            ) : null}
          </Defs>
          <G>
            {gradient || (g && small && fill) ? <Rect x={0} y={0} width={size.w} height={size.h} fill={gradient ? `url(#f${uid})` : `url(#e${uid})`} /> : null}
            {blobs?.map((b, i) => {
              const e = { cx: b.cx * size.w, cy: b.cy * size.h, rx: b.rx * size.w, ry: b.ry * size.h, fill: b.color, opacity: b.opacity ?? 1 };
              if (b.blur) {
                const grow = 2.5 * b.blur;
                return (
                  <G key={i}>
                    <Ellipse cx={e.cx} cy={e.cy} rx={e.rx + grow} ry={e.ry + grow} fill={`url(#b${uid}${i})`} mask={b.fade ? `url(#mb${uid}${i})` : undefined} />
                    {b.fade ? <Ellipse cx={e.cx} cy={e.cy} rx={e.rx + 5} ry={e.ry + 5} fill={`url(#bs${uid}${i})`} mask={`url(#ms${uid}${i})`} /> : null}
                  </G>
                );
              }
              return (
              <Ellipse
                key={i}
                cx={b.cx * size.w}
                cy={b.cy * size.h}
                rx={b.rx * size.w}
                ry={b.ry * size.h}
                fill={`url(#b${uid}${i})`}
              />
              );
            })}
            {/* icon bubbles in the canvas: the colour is softly veiled and grained, never a dark disc */}
            {g && small ? <Rect x={0} y={0} width={size.w} height={size.h} fill="#FFFFFF" opacity={0.08} /> : null}
          </G>
        </Svg>
        ) : null}
        {g ? (
          // The canvas inner shadows, as the canvas writes them (CSS inset box-shadows): drawn natively,
          // a true smooth Gaussian on the GPU, with no bands and no cost per frame.
          <View style={[StyleSheet.absoluteFill, { borderRadius: R, borderCurve: 'continuous', boxShadow: insetOf(glow, small) }]} />
        ) : null}
        {glow === 'frost' || (g && small) ? (
          <Image source={noiseTile(noise)} resizeMode="repeat" style={{ position: 'absolute', top: 0, left: 0, width: size.w, height: size.h, opacity: 0.5 }} />
        ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const W = (a: number) => `rgba(255,255,255,${a})`;
/** The canvas's inner light per glow (blur = 2σ of the Figma inner shadows, spread = how far it starts inside). */
function insetOf(glow: GlowStrength, small: boolean) {
  if (small) return `inset 0 4px 10px 6px ${W(0.18)}, inset 0 4px 4px 3px ${W(0.5)}, inset 0 -4px 4px 3px ${W(0.3)}`;
  const g = glow === 'button' ? { wide: 0.35, top: 0.6, bottom: 0.35 } : { wide: 0.65, top: 0.95, bottom: 0.65 };
  const frost = glow === 'frost' ? `inset 0 4px 87px 6px ${W(0.2)}, ` : '';
  return `${frost}inset 0 4px 14px 3px ${W(g.wide)}, inset 0 4px 4px 0 ${W(g.top)}, inset 0 -4px 4px 0 ${W(g.bottom)}`;
}

/** erf, Abramowitz–Stegun 7.1.26 (|error| < 1.5e-7) */
function erf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/**
 * A Gaussian-blurred ellipse drawn as a radial gradient (no filter, cheap to scroll):
 * the stops follow the blurred edge profile of a disc of the ellipse's mean radius.
 */
function BlurGradient({ id, b, w, h }: { id: string; b: Blob; w: number; h: number }) {
  const sigma = b.blur!;
  const R = (b.rx * w + b.ry * h) / 2;
  const Rg = R + 2.5 * sigma;
  const k = sigma * Math.SQRT2;
  const stops = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12;
    const r = t * Rg;
    return { t, a: 0.5 * (erf((R - r) / k) + erf((R + r) / k)) };
  });
  return (
    <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
      {stops.map((st) => (
        <Stop key={st.t} offset={st.t} stopColor={b.color} stopOpacity={(b.opacity ?? 1) * st.a} />
      ))}
    </RadialGradient>
  );
}

/** The two masks of a Figma progressive blur: blurred copy fades out along the line, sharp copy fades in. */
function FadeMask({ id, b, w, h }: { id: string; b: Blob; w: number; h: number }) {
  const f = b.fade!;
  const cx = b.cx * w;
  const cy = b.cy * h;
  // CSS gradient line over the ellipse box padded by 150 on each side
  const W = 2 * b.rx * w + 300;
  const H = 2 * b.ry * h + 300;
  const [dx, dy] = f.dir;
  const L = Math.abs(W * dx) + Math.abs(H * dy);
  const line = { x1: cx - (dx * L) / 2, y1: cy - (dy * L) / 2, x2: cx + (dx * L) / 2, y2: cy + (dy * L) / 2 };
  const box = { x: cx - W / 2, y: cy - H / 2, width: W, height: H };
  return (
    <>
      <LinearGradient id={`gb${id}`} gradientUnits="userSpaceOnUse" {...line}>
        <Stop offset={f.from} stopColor="#fff" stopOpacity={1} />
        <Stop offset={f.to} stopColor="#fff" stopOpacity={0} />
      </LinearGradient>
      <LinearGradient id={`gs${id}`} gradientUnits="userSpaceOnUse" {...line}>
        <Stop offset={f.from} stopColor="#fff" stopOpacity={0} />
        <Stop offset={f.to} stopColor="#fff" stopOpacity={1} />
      </LinearGradient>
      <Mask id={`mb${id}`} maskUnits="userSpaceOnUse" {...box}>
        <Rect {...box} fill={`url(#gb${id})`} />
      </Mask>
      <Mask id={`ms${id}`} maskUnits="userSpaceOnUse" {...box}>
        <Rect {...box} fill={`url(#gs${id})`} />
      </Mask>
    </>
  );
}

const styles = StyleSheet.create({
  // Behind the children on every platform (on web, positioned layers would otherwise paint above static icons).
  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 },
});
