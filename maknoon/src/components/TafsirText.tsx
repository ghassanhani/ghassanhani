import { Text } from 'react-native';
import { F } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

/**
 * Renders a tafsir passage exactly as published (ND licence), turning the
 * publishers' inline markup into styling only — no characters are changed
 * except the markers themselves, which are formatting, not content:
 *   ¬ … ¥   edition / manuscript note (Ibn Kathir, Dar Ibn al-Jawzi) → small muted
 *   _ … _   highlighted gharib word (al-Mukhtasar)                     → teal
 *   { … }   Quran quotation                                             → kept, teal, in the Quran font
 */
export function TafsirText({ text, numberOfLines, color = colors.ink }: { text: string; numberOfLines?: number; color?: string }) {
  const body = text.replace(/^\s+/, '').replace(/\r\n?/g, '\n');
  const parts: { t: string; k: 'plain' | 'note' | 'gharib' | 'quran' }[] = [];
  const re = /¬([\s\S]*?)¥|_([^_\n]+)_|(\{[^}]*\})/g;
  let last = 0;
  for (let m: RegExpExecArray | null; (m = re.exec(body)); ) {
    if (m.index > last) parts.push({ t: body.slice(last, m.index), k: 'plain' });
    if (m[1] !== undefined) parts.push({ t: m[1], k: 'note' });
    else if (m[2] !== undefined) parts.push({ t: m[2], k: 'gharib' });
    else parts.push({ t: m[3], k: 'quran' });
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push({ t: body.slice(last), k: 'plain' });

  return (
    <Text numberOfLines={numberOfLines} style={{ fontFamily: F.sans, fontSize: 14, lineHeight: 24, color, writingDirection: 'rtl' }}>
      {parts.map((p, i) =>
        p.k === 'note' ? (
          <Text key={i} style={{ fontSize: 11, color: colors.muted }}>
            {` (${p.t}) `}
          </Text>
        ) : p.k === 'gharib' ? (
          <Text key={i} style={{ color: colors.primary, fontFamily: F.sansBold }}>
            {p.t}
          </Text>
        ) : p.k === 'quran' ? (
          <Text key={i} style={{ color: colors.primary, fontFamily: F.quran, fontSize: 16 }}>
            {p.t}
          </Text>
        ) : (
          p.t
        ),
      )}
    </Text>
  );
}
