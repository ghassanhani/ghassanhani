import { memo, useMemo } from 'react';
import { Text, View, type StyleProp, type TextStyle } from 'react-native';
import { AyahMarker } from '@/components/AyahMarker';
import { isRTL } from '@/components/motion';
import { AyahText } from '@/components/Typography';
import { ayahGlyphs, qcf4Available, useQcf4FontSet } from '@/content/qcf4';
import { getAyah } from '@/content/quran';
import { colors } from '@/theme/tokens';

/**
 * One ayah drawn as in the Madinah Mushaf (QCF4): the same glyphs, in the same page fonts, as the
 * Mushaf screen, flowing over as many lines as the space needs. Where the QCF4 fonts are not
 * bundled (web) it falls back to the KFGQPC Hafs text and font. Text is never typed here: glyph
 * codes come from the verified page data, the fallback from the Quran text file.
 */
export const MadinahAyah = memo(function MadinahAyah({ surah, ayah, size = 22, color = colors.ink, align = 'right', numberOfLines, style }: { surah: number; ayah: number; size?: number; color?: string; align?: 'right' | 'center'; numberOfLines?: number; style?: StyleProp<TextStyle> }) {
  const key = `${surah}:${ayah}`;
  const runs = useMemo(() => (qcf4Available() ? ayahGlyphs(key) : []), [key]);
  const ready = useQcf4FontSet(runs.map((r) => r.f));
  if (!runs.length || !ready) {
    const t = getAyah(surah, ayah);
    return (
      <AyahText size={size} lineHeight={size * 1.9} color={color} numberOfLines={numberOfLines} style={[{ textAlign: align, fontFamily: t?.fontFamily }, style]}>
        {t?.text ?? ''}
      </AyahText>
    );
  }
  const lineH = size * 1.9;
  return (
    <View style={[{ flexDirection: isRTL() ? 'row' : 'row-reverse', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', columnGap: size * 0.22, alignItems: 'center' }, numberOfLines ? { maxHeight: lineH * numberOfLines, overflow: 'hidden' } : null, style as never]}>
      {runs.flatMap((r, ri) =>
        r.g.map((ch, gi) =>
          r.end[gi] ? (
            <View key={`${ri}-${gi}`} style={{ height: lineH, justifyContent: 'center' }}>
              <AyahMarker n={ayah} scale={(size / 21) * 0.86} />
            </View>
          ) : (
            <Text key={`${ri}-${gi}`} style={{ fontFamily: r.f, fontSize: size, lineHeight: lineH, color }}>
              {ch}
            </Text>
          ),
        ),
      )}
    </View>
  );
});
