import { Text, type TextProps } from 'react-native';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';
import { AyahMarker, ayahNumberOfMark } from './AyahMarker';

type Props = TextProps & { size?: number; color?: string; lineHeight?: number };

/** Thmanyah Serif Display, black — every heading. */
export function Display({ size = 20, color = colors.ink, lineHeight, style, ...rest }: Props) {
  return <Text {...rest} style={[{ fontFamily: F.display, fontSize: size, color, lineHeight: lineHeight ?? Math.round(size * 1.35), writingDirection: 'rtl' }, style]} />;
}

/** Thmanyah Sans — body and UI. */
export function Body({ size = 14, color = colors.ink, lineHeight, weight = 'regular', style, ...rest }: Props & { weight?: 'regular' | 'medium' | 'bold' }) {
  const fontFamily = weight === 'bold' ? F.sansBold : weight === 'medium' ? F.sansMedium : F.sans;
  return <Text {...rest} style={[{ fontFamily, fontSize: size, color, lineHeight: lineHeight ?? Math.round(size * 1.6), writingDirection: 'rtl' }, style]} />;
}

/** Amiri Quran — ayat only. Generous line-height for tashkeel. */
// Ayah-end marks: the KFGQPC numbered medallions (U+FC00–U+FDFF in its font) and ۝ + digits (Tanzil).
const AYAH_MARK = /([\uFC00-\uFDFF]|\u06DD[\u0660-\u0669]+)/;

/**
 * Quran text. Each ayah-end mark is drawn as the design's marker (teal medallion with the ayah
 * number) in place of the font's medallion; the words themselves are untouched.
 */
export function AyahText({ size = 22, color = colors.ink, lineHeight, style, children, ...rest }: Props & { markColor?: string }) {
  const content =
    typeof children === 'string' && AYAH_MARK.test(children)
      ? children.split(AYAH_MARK).map((part, i) => {
          if (!AYAH_MARK.test(part)) return part;
          const n = ayahNumberOfMark(part);
          return n ? <AyahMarker key={i} n={n} scale={size / 21} /> : part;
        })
      : children;
  return (
    <Text {...rest} style={[{ fontFamily: F.quran, fontSize: size, color, lineHeight: lineHeight ?? Math.round(size * 2.0), writingDirection: 'rtl' }, style]}>
      {content}
    </Text>
  );
}

/** Caption — 12px muted. */
export function Caption({ color = colors.muted, ...rest }: Props) {
  return <Body size={12} color={color} lineHeight={19} {...rest} />;
}
