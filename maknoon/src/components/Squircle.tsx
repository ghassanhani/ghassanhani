import { getSvgPath } from 'figma-squircle';
import { type ReactNode, useId, useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View, type ViewProps, type ViewStyle, type StyleProp } from 'react-native';
import Svg, {
  ClipPath,
  Mask,
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  G,
  Image as SvgImage,
  LinearGradient,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { type Blob, CORNER_SMOOTHING } from '@/theme/tokens';

/** frost = glass + the wide faint light + grain: large glass cards only (icon bubbles stay glass). */
export type GlowStrength = 'none' | 'glass' | 'frost' | 'button';

// The canvas's frosted grain: a 256px noise tile drawn at 38px, 50% opacity, over every glass surface.
const NOISE = require('../../assets/brand/glass-noise.png');

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

  const d = useMemo(() => {
    if (!size || size.w < 1 || size.h < 1) return null;
    const r = Math.min(radius, Math.min(size.w, size.h) / 2);
    const isPill = r >= Math.min(size.w, size.h) / 2 - 0.5;
    return getSvgPath({ width: size.w, height: size.h, cornerRadius: r, cornerSmoothing: isPill ? 0 : CORNER_SMOOTHING });
  }, [size, radius]);

  // On small round shapes (icon bubbles) the canvas glow is a thin rim; the card-sized band would wash the colour out.
  const small = !!size && Math.max(size.w, size.h) < 64;
  const g = glow === 'glass' || glow === 'frost' ? { wide: 0.65, top: 0.95, bottom: 0.65 } : glow === 'button' ? { wide: 0.35, top: 0.6, bottom: 0.35 } : null;

  return (
    <View
      {...rest}
      onLayout={handleLayout}
      // Until measured, approximate with a continuous-curve radius so the first frame is not square.
      style={[{ borderRadius: d ? 0 : radius, borderCurve: 'continuous', zIndex: 0 }, !d && fill ? { backgroundColor: fill } : null, style]}
    >
      {d && size ? (
        <View style={styles.bg} pointerEvents="none">
        <Svg width={size.w} height={size.h}>
          <Defs>
            <ClipPath id={`c${uid}`}>
              <Path d={d} />
            </ClipPath>
            {gradient ? (
              <LinearGradient id={`f${uid}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={gradient[0]} />
                <Stop offset="1" stopColor={gradient[1]} />
              </LinearGradient>
            ) : null}
            {blobs?.map((b, i) =>
              b.blur ? (
                <G key={i}>
                  <Filter id={`bf${uid}${i}`} filterUnits="userSpaceOnUse" x={-400} y={-400} width={size.w + 800} height={size.h + 800}>
                    <FeGaussianBlur stdDeviation={b.blur} />
                  </Filter>
                  <Filter id={`bs${uid}${i}`} filterUnits="userSpaceOnUse" x={-400} y={-400} width={size.w + 800} height={size.h + 800}>
                    <FeGaussianBlur stdDeviation={2} />
                  </Filter>
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
            {g ? (
              <>
                <Filter id={`g${uid}`} filterUnits="userSpaceOnUse" x={-200} y={-200} width={size.w + 400} height={size.h + 400}>
                  <FeGaussianBlur stdDeviation={small ? 5 : 7} />
                </Filter>
                <Filter id={`h${uid}`} filterUnits="userSpaceOnUse" x={-200} y={-200} width={size.w + 400} height={size.h + 400}>
                  <FeGaussianBlur stdDeviation={2} />
                </Filter>
                <Filter id={`w${uid}`} filterUnits="userSpaceOnUse" x={-200} y={-200} width={size.w + 400} height={size.h + 400}>
                  <FeGaussianBlur stdDeviation={43.5} />
                </Filter>
              </>
            ) : null}
            {g && small && fill ? (
              <RadialGradient id={`e${uid}`} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor={fill} stopOpacity={0.92} />
                <Stop offset="0.72" stopColor={fill} stopOpacity={0.88} />
                <Stop offset="1" stopColor={fill} stopOpacity={0.45} />
              </RadialGradient>
            ) : null}
            {glow === 'frost' || (g && small) ? (
              <Pattern id={`n${uid}`} patternUnits="userSpaceOnUse" width={noise} height={noise}>
                <SvgImage href={NOISE} width={noise} height={noise} preserveAspectRatio="none" />
              </Pattern>
            ) : null}
          </Defs>
          <G clipPath={`url(#c${uid})`}>
            {fill || gradient ? <Path d={d} fill={gradient ? `url(#f${uid})` : g && small && fill ? `url(#e${uid})` : fill} /> : null}
            {blobs?.map((b, i) => {
              const e = { cx: b.cx * size.w, cy: b.cy * size.h, rx: b.rx * size.w, ry: b.ry * size.h, fill: b.color, opacity: b.opacity ?? 1 };
              if (b.blur)
                return (
                  <G key={i}>
                    <Ellipse {...e} filter={`url(#bf${uid}${i})`} mask={b.fade ? `url(#mb${uid}${i})` : undefined} />
                    {b.fade ? <Ellipse {...e} filter={`url(#bs${uid}${i})`} mask={`url(#ms${uid}${i})`} /> : null}
                  </G>
                );
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
            {g && !small ? (
              <>
                {/* The canvas inner shadows, reproduced exactly: each one is the area outside the shape
                    (grown inward by `erode`), shifted, blurred and filled white. Ordered as in the canvas. */}
                {glow === 'frost' ? <Inset d={d} w={size.w} h={size.h} erode={6} dy={4} opacity={0.2} filter={`url(#w${uid})`} /> : null}
                <Inset d={d} w={size.w} h={size.h} erode={3} dy={4} opacity={g.wide} filter={`url(#g${uid})`} />
                <Inset d={d} w={size.w} h={size.h} erode={0} dy={4} opacity={g.top} filter={`url(#h${uid})`} />
                <Inset d={d} w={size.w} h={size.h} erode={0} dy={-4} opacity={g.bottom} filter={`url(#h${uid})`} />
              </>
            ) : null}
            {g && small ? (
              <>
                <Path d={d} fill="none" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={12} filter={`url(#g${uid})`} transform="translate(0 4)" />
                <Path d={d} fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={6} filter={`url(#h${uid})`} transform="translate(0 4)" />
                <Path d={d} fill="none" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={6} filter={`url(#h${uid})`} transform="translate(0 -4)" />
              </>
            ) : null}
            {/* icon bubbles in the canvas: the colour is softly veiled and grained, never a dark disc */}
            {g && small ? <Rect x={0} y={0} width={size.w} height={size.h} fill="#FFFFFF" opacity={0.08} /> : null}
            {glow === 'frost' || (g && small) ? <Rect x={0} y={0} width={size.w} height={size.h} fill={`url(#n${uid})`} opacity={0.5} /> : null}
          </G>
          {stroke ? (
            <G clipPath={`url(#c${uid})`}>
              <Path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth * 2} />
            </G>
          ) : null}
        </Svg>
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** An inset shadow: white outside the shape plus an `erode`-wide band inside its edge, offset and blurred. */
function Inset({ d, w, h, erode, dy, opacity, filter }: { d: string; w: number; h: number; erode: number; dy: number; opacity: number; filter: string }) {
  const P = 200;
  const outside = `M${-P} ${-P}H${w + P}V${h + P}H${-P}Z ${d}`;
  return (
    <G opacity={opacity} filter={filter}>
      <G transform={`translate(0 ${dy})`}>
        <Path d={outside} fill="#FFFFFF" fillRule="evenodd" />
        {erode ? <Path d={d} fill="none" stroke="#FFFFFF" strokeWidth={erode * 2} /> : null}
      </G>
    </G>
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
