import { Text, type TextProps } from 'react-native';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

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
export function AyahText({ size = 22, color = colors.ink, lineHeight, style, ...rest }: Props) {
  return <Text {...rest} style={[{ fontFamily: F.quran, fontSize: size, color, lineHeight: lineHeight ?? Math.round(size * 2.0), writingDirection: 'rtl' }, style]} />;
}

/** Caption — 12px muted. */
export function Caption({ color = colors.muted, ...rest }: Props) {
  return <Body size={12} color={color} lineHeight={19} {...rest} />;
}
