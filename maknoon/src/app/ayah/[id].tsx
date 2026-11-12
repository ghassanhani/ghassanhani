import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DetailHeader } from '@/components/DetailHeader';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { TafsirText } from '@/components/TafsirText';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { CountBadge, GlassCard, HeroCard, InnerCard, ReviewedChip, SuggestedChip } from '@/components/ui';
import { ayahToday, home } from '@/content/design';
import { ar, ayahPlaceholder, getAyah, quranSource } from '@/content/quran';
import { packsSupported } from '@/content/packs';
import { useTafsir, type TafsirEntry } from '@/content/tafsir';
import { quranIndex } from '@/content/worship';
import { colors } from '@/theme/tokens';

/** Ayah detail ("آية اليوم"): canonical text on top, link drawers below. */
export default function AyahScreen() {
  const { id = '3:3' } = useLocalSearchParams<{ id: string }>();
  const [s, a] = id.split(':').map(Number);
  const meta = home.ayahOfDay; // the design defines آل عمران ٣
  const isDesignAyah = s === meta.surah && a === meta.ayah;
  const ayah = getAyah(s, a);
  const all = useTafsir(s, a);
  const tafsir = (all ?? []).filter((t) => t.text);
  const missing = (all ?? []).filter((t) => !t.installed);

  return (
    <Screen backdrop="sky" withTabBar={false} header={<DetailHeader title={ayahToday.title} />}>
      <HeroCard hero="ocean" style={{ minHeight: 210 }}>
        <View style={styles.between}>
          <Display size={22} color={colors.white}>
            {ayahToday.title}
          </Display>
          <View style={[styles.row, { gap: 8 }]}>
            <GlassIcon name="image" label="صورة للمشاركة" />
            <GlassIcon name="play" label="استماع" />
          </View>
        </View>
        <AyahText size={23} lineHeight={46} color={colors.white} style={[{ marginTop: 8 }, ayah && { fontFamily: ayah.fontFamily }]}>
          {ayah ? ayah.text : ayahPlaceholder(isDesignAyah ? meta.surahName : (quranIndex.surahs[s - 1]?.name ?? String(s)), a)}
        </AyahText>
        <Caption color="rgba(255,255,255,0.8)">{isDesignAyah ? meta.ref : `${quranIndex.surahs[s - 1]?.name ?? ar(s)} : ${ar(a)}`}</Caption>
        <Caption color="rgba(255,255,255,0.55)" style={{ fontSize: 10 }}>
          {quranSource.credit}
        </Caption>
      </HeroCard>

      <Drawer title={ayahToday.tafsirTitle} count={tafsir.length ? String(tafsir.length) : undefined}>
        {tafsir.length ? (
          tafsir.map((t) => <TafsirCard key={t.key} entry={t as TafsirEntry & { text: string }} />)
        ) : all === null ? (
          <Caption>…</Caption>
        ) : (
          <InnerCard>
            <Body size={14} color={colors.primary}>
              {ayahToday.tafsirPlaceholder}
            </Body>
          </InnerCard>
        )}
      {packsSupported && missing.length ? (
          <Pressable accessibilityRole="link" onPress={() => router.push('/settings')}>
            <Squircle radius={30} fill="rgba(247,241,241,0.61)" stroke="#FFFFFF" glow="glass" style={styles.more}>
              <Body size={13} weight="medium" color={colors.primary}>
                {`نزّل ${missing.map((m) => m.title).join('، ')} من حزم التفسير`}
              </Body>
            </Squircle>
          </Pressable>
        ) : null}
      </Drawer>

      <Drawer title={ayahToday.hadithTitle}>
        <Caption>لا توجد بعد روابط أحاديث مُراجَعة لهذه الآية.</Caption>
      </Drawer>
    </Screen>
  );
}

function TafsirCard({ entry }: { entry: TafsirEntry & { text: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <InnerCard style={{ gap: 6 }}>
      <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
        <Display size={15}>{entry.title}</Display>
        {/* Status = the publisher's own editorial stage in the Itqan file. */}
        {entry.stage === 'approved' ? <ReviewedChip /> : entry.stage === 'in-review' ? <SuggestedChip /> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={open ? 'عرض أقل' : 'اقرأ التفسير كاملًا'} onPress={() => setOpen((v) => !v)}>
        <TafsirText text={entry.text} numberOfLines={open ? undefined : 5} />
        <Body size={12} weight="bold" color={colors.primary} style={{ marginTop: 4 }}>
          {open ? 'عرض أقل' : 'اقرأ كاملًا'}
        </Body>
      </Pressable>
      {open && entry.footnote ? <Caption>{entry.footnote}</Caption> : null}
      <Caption>{`يشرح${entry.edition ? ` · ${entry.edition}` : ''} · ${entry.attribution}`}</Caption>
    </InnerCard>
  );
}

function GlassIcon({ name, label }: { name: 'play' | 'image'; label: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}>
      <Squircle radius={18} fill="rgba(255,255,255,0.2)" glow="button" style={styles.glassIcon}>
        <Icon name={name} size={16} color={colors.white} />
      </Squircle>
    </Pressable>
  );
}

/** A collapsible group of typed links (التفسير، الأحاديث …). */
function Drawer({ title, count, children }: { title: string; count?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <GlassCard style={{ gap: 12 }}>
      <View style={[styles.between, { alignItems: 'center' }]}>
        <View style={[styles.row, { gap: 8 }]}>
          <Display size={22}>{title}</Display>
          {count ? <CountBadge value={count} /> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={open ? 'طيّ' : 'توسيع'} onPress={() => setOpen((v) => !v)} style={styles.ring}>
          <View style={{ transform: [{ rotate: open ? '0deg' : '90deg' }] }}>
            <Icon name="chevronDown" size={17} color={colors.ink} />
          </View>
        </Pressable>
      </View>
      {open ? children : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  glassIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  more: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ring: { width: 37, height: 37, borderRadius: 18.5, borderWidth: 1, borderColor: colors.ring, alignItems: 'center', justifyContent: 'center' },
});
