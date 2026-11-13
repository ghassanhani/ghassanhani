import { Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ar } from '@/content/quran';
import { F } from '@/theme/fonts';
import { AYAH_MARKER_XML } from './ayahMarker';

/**
 * The ayah marker from the design canvas: a teal medallion with gold dots around a light disc,
 * the number set in the display font in dark ink. Drawn at 20.973 × 27.934 beside 21pt text,
 * so `scale` is the text size / 21. Used wherever an ayah ends, in place of the font's own mark.
 */
export function AyahMarker({ n, scale = 1 }: { n: number; scale?: number }) {
  const w = 20.973 * scale;
  const h = 27.934 * scale;
  const digits = ar(n);
  // the design sets one digit at 13pt in the 21pt box; longer numbers step down to stay inside the disc
  const fs = (digits.length === 1 ? 13 : digits.length === 2 ? 11 : 8.5) * scale;
  return (
    <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`الآية ${digits}`}>
      <View style={{ position: 'absolute', left: 0.807 * scale, top: 4.033 * scale, width: 19.36 * scale, height: 19.36 * scale, borderRadius: 9.68 * scale, backgroundColor: '#E2E2E2' }} />
      <SvgXml xml={AYAH_MARKER_XML} width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }} />
      <Text style={{ fontFamily: F.display, fontSize: fs, lineHeight: fs * 1.25, color: '#2E2F39', textAlign: 'center', marginTop: 1 * scale }}>{digits}</Text>
    </View>
  );
}

/**
 * The ayah number a text mark stands for: the KFGQPC numbered medallions are U+FC00 (ayah 1)
 * onward in its font; Tanzil writes ۝ followed by the digits.
 */
export function ayahNumberOfMark(mark: string): number | null {
  const cp = mark.codePointAt(0) ?? 0;
  if (cp >= 0xfc00 && cp <= 0xfdff) return cp - 0xfc00 + 1;
  const m = mark.match(/^\u06DD([\u0660-\u0669]+)$/);
  return m ? Number([...m[1]].map((d) => d.charCodeAt(0) - 0x0660).join('')) : null;
}
