import { router } from 'expo-router';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { curatedNodes, type Node } from '@/assistant/corpus';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { Chip, GlassCard, HeroCard } from '@/components/ui';
import { search as s } from '@/content/design';
import { searchTafsirPack } from '@/content/packs';
import { ar, getAyah } from '@/content/quran';
import { quranIndex } from '@/content/worship';
import { matchCount, rootInfo, searchQuran, terms } from '@/search/engine';
import { fuse, searchByMeaning, semanticEnabled, type SemanticHit } from '@/search/semantic';
import { F } from '@/theme/fonts';
import { colors, space } from '@/theme/tokens';

type Filter = 'all' | 'quran' | 'hadith' | 'tafsir' | 'fiqh';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: s.filters[0] },
  { id: 'quran', label: s.filters[1] },
  { id: 'hadith', label: s.filters[2] },
  { id: 'tafsir', label: s.filters[3] },
  { id: 'fiqh', label: s.filters[4] },
];
const KIND_FILTER: Record<Node['kind'], Filter> = { ayah: 'quran', hadith: 'hadith', dhikr: 'hadith', fiqh: 'fiqh', usul: 'fiqh', topic: 'all', grammar: 'all', tafsir: 'tafsir' };

/**
 * Unified smart search (plan §7.3), on-device: root-aware BM25 over all ayat,
 * plus the app's hadith, adhkar and modules, plus (iOS/Android) the al-Mukhtasar pack.
 */
export default function SearchScreen() {
  const [query, setQuery] = useState(s.query);
  const [filter, setFilter] = useState<Filter>('all');
  const [moreFor, setMoreFor] = useState(''); // «عرض المزيد» applies to one query + filter only
  const q = useDeferredValue(query.trim());

  const root = useMemo(() => (q ? rootInfo(q) : null), [q]);
  const lexical = useMemo(() => (q ? searchQuran(q, 30) : []), [q]);
  // Meaning-based results (Cloudflare Worker embeds the phrase; matching is on-device), fused by rank.
  const [semantic, setSemantic] = useState<{ q: string; hits: SemanticHit[] }>({ q: '', hits: [] });
  useEffect(() => {
    let alive = true;
    if (!q || !semanticEnabled || rootInfo(q)?.letters === q) return;
    searchByMeaning(q, 30).then((hits) => alive && setSemantic({ q, hits }));
    return () => {
      alive = false;
    };
  }, [q]);
  const ayat = useMemo(() => fuse(lexical, semantic.q === q ? semantic.hits : [], 30), [lexical, semantic, q]);
  const others = useMemo(() => {
    if (!q) return [];
    const need = Math.max(1, Math.ceil(terms(q).length * 0.6));
    const scored = curatedNodes.map((n) => ({ n, m: matchCount(n.norm, q) })).sort((a, b) => b.m - a.m);
    return scored.filter((x) => x.m >= need).map((x) => x.n); // no relaxed fallback (see assistant/engine.ts)
  }, [q]);
  const [tafsir, setTafsir] = useState<Node[]>([]);
  useEffect(() => {
    let alive = true;
    searchTafsirPack(q, 5)
      .then((r) => alive && setTafsir(r))
      .catch(() => alive && setTafsir([]));
    return () => {
      alive = false;
    };
  }, [q]);
  const more = moreFor === `${q}|${filter}`;

  const showQuran = filter === 'all' || filter === 'quran';
  const shownOthers = others.filter((n) => filter === 'all' || KIND_FILTER[n.kind] === filter);
  const showTafsir = filter === 'all' || filter === 'tafsir';
  const ayatShown = ayat.slice(0, more ? 30 : filter === 'quran' ? 10 : 4);
  const nothing = q && !ayat.length && !others.length && !tafsir.length && (!semanticEnabled || semantic.q === q);

  return (
    <Screen backdrop="mist">
      <Display size={30} lineHeight={44} style={{ marginTop: 8 }}>
        {s.title}
      </Display>

      <Squircle radius={32} fill="rgba(255,255,255,0.5)" glow="glass" style={styles.field}>
        <Icon name="search" size={24} color="#35625B" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث في القرآن والحديث والكتب"
          placeholderTextColor={colors.muted}
          style={[styles.input, { fontFamily: F.sansMedium }]}
          accessibilityLabel="ابحث"
          returnKeyType="search"
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="مسح" onPress={() => setQuery('')}>
            <Squircle radius={19} fill="rgba(255,255,255,0.6)" glow="glass" style={styles.clear}>
              <Icon name="close" size={18} color={colors.ink} />
            </Squircle>
          </Pressable>
        ) : null}
      </Squircle>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.railContent}>
        {FILTERS.map((f) => {
          const on = f.id === filter;
          return (
            <Pressable key={f.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setFilter(f.id)}>
              <Squircle radius={21} fill={on ? colors.primary : 'rgba(255,255,255,0.7)'} glow={on ? 'button' : 'glass'} stroke={on ? undefined : '#FFFFFF'} style={styles.filter}>
                <Body size={14} weight={on ? 'bold' : 'medium'} color={on ? colors.white : colors.ink} lineHeight={20}>
                  {f.label}
                </Body>
              </Squircle>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Root card — «ر ح م · جذر · يجمع المشتقات دون تشكيل» */}
      {root && showQuran ? (
        <GlassCard style={{ gap: 12 }}>
          <View style={[styles.row, { gap: 10, flexWrap: 'wrap' }]}>
            <Display size={22}>{root.letters}</Display>
            <Squircle radius={12} fill={colors.white} style={styles.note}>
              <Body size={12} color={colors.primary} lineHeight={18}>
                {s.root.note}
              </Body>
            </Squircle>
            <Caption>{`${ar(root.ayat)} آية`}</Caption>
          </View>
          <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
            {root.forms.slice(0, 8).map((w) => (
              <Pressable key={w} accessibilityRole="button" onPress={() => setQuery(w)}>
                <Squircle radius={20} fill="rgba(206,225,228,0.6)" glow="glass" style={styles.word}>
                  <Body size={15} weight="medium" lineHeight={22}>
                    {w}
                  </Body>
                </Squircle>
              </Pressable>
            ))}
          </View>
        </GlassCard>
      ) : null}

      {showQuran &&
        ayatShown.map((h) => {
          const a = getAyah(h.surah, h.ayah);
          return (
            <Pressable key={h.key} accessibilityRole="link" onPress={() => router.push(`/ayah/${h.key}` as never)}>
              <GlassCard style={{ gap: 4 }}>
                <View style={styles.between}>
                  <View style={[styles.row, { gap: 8 }]}>
                    <Display size={20}>{s.ayah.label}</Display>
                    {h.via === 'meaning' ? <Chip label="بالمعنى" tone="suggested" /> : null}
                  </View>
                  <Caption>{`${quranIndex.surahs[h.surah - 1].name} · ${ar(h.ayah)}`}</Caption>
                </View>
                <AyahText size={21} lineHeight={40} style={a ? { fontFamily: a.fontFamily } : null}>
                  {a?.text ?? ''}
                </AyahText>
              </GlassCard>
            </Pressable>
          );
        })}
      {showQuran && ayat.length > ayatShown.length ? (
        <Pressable accessibilityRole="button" onPress={() => setMoreFor(`${q}|${filter}`)}>
          <Squircle radius={30} fill="rgba(247,241,241,0.61)" stroke="#FFFFFF" glow="glass" style={styles.more}>
            <Body size={14} weight="medium" color={colors.primary}>
              {`عرض المزيد من الآيات (${ar(ayat.length - ayatShown.length)})`}
            </Body>
          </Squircle>
        </Pressable>
      ) : null}

      {shownOthers.map((n) => (
        <Pressable key={n.id} accessibilityRole="link" disabled={!n.route} onPress={() => n.route && router.push(n.route as never)}>
          <GlassCard style={{ gap: 6 }}>
            <View style={[styles.between, { gap: 8 }]}>
              <Display size={18} style={{ flex: 1 }}>
                {n.title}
              </Display>
              {n.tone ? <Chip label={n.chip ?? (n.tone === 'reviewed' ? 'مُراجَع' : 'بانتظار المراجعة')} tone={n.tone} badge={n.tone === 'reviewed'} /> : null}
            </View>
            {n.text ? (
              <Display size={17} lineHeight={30}>
                {n.text}
              </Display>
            ) : null}
            <Caption>{n.ref}</Caption>
          </GlassCard>
        </Pressable>
      ))}

      {showTafsir &&
        tafsir.map((n) => (
          <Pressable key={n.id} accessibilityRole="link" onPress={() => router.push(n.route as never)}>
            <GlassCard style={{ gap: 4 }}>
              <View style={styles.between}>
                <Display size={18}>{n.title}</Display>
                <Caption>{`${quranIndex.surahs[n.surah! - 1].name} · ${ar(n.ayah!)}`}</Caption>
              </View>
              <Caption>اضغط لقراءة التفسير كاملًا مع الآية</Caption>
            </GlassCard>
          </Pressable>
        ))}

      {nothing ? (
        <GlassCard>
          <Body size={14} color="#4A4B57">
            لا نتائج. جرّب جذر الكلمة (مثل «ر ح م») أو كلمة أخرى.
          </Body>
        </GlassCard>
      ) : null}

      {/* Assistant — retrieval-only, never a fatwa */}
      <Pressable accessibilityRole="link" onPress={() => router.push('/assistant')}>
        <HeroCard hero="forest" style={{ gap: 8 }}>
          <Display size={22} color={colors.white}>
            {s.assistant.title}
          </Display>
          <Body size={13} color="rgba(255,255,255,0.9)" lineHeight={20}>
            {s.assistant.note}
          </Body>
          <Squircle radius={24} fill={colors.white} style={styles.ask}>
            <Body size={15} color={colors.muted}>
              {s.assistant.placeholder}
            </Body>
          </Squircle>
        </HeroCard>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  field: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingStart: 20, paddingEnd: 13 },
  input: { flex: 1, minWidth: 0, fontSize: 18, color: colors.inkDeep, writingDirection: 'rtl', textAlign: 'right', paddingVertical: 0, outlineWidth: 0 },
  clear: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  rail: { marginHorizontal: -space.gutter, flexGrow: 0 },
  railContent: { paddingHorizontal: space.gutter, gap: 9, paddingVertical: 2 },
  filter: { height: 42, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  note: { height: 26, paddingHorizontal: 9, justifyContent: 'center' },
  word: { height: 40, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  more: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ask: { height: 46, paddingHorizontal: 18, justifyContent: 'center', marginTop: 6 },
});
