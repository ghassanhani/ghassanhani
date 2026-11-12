import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DetailHeader } from '@/components/DetailHeader';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { CountBadge, GlassCard, HeroCard, InnerCard, ReviewedChip, SuggestedChip } from '@/components/ui';
import { ayahToday, home, type LinkItem } from '@/content/design';
import { ayahEnd, ayahPlaceholder, getAyah } from '@/content/quran';
import { colors } from '@/theme/tokens';

/** Ayah detail ("آية اليوم"): canonical text on top, link drawers below. */
export default function AyahScreen() {
  const { id = '3:3' } = useLocalSearchParams<{ id: string }>();
  const [s, a] = id.split(':').map(Number);
  const meta = home.ayahOfDay; // the design only defines آل عمران ٣
  const isDesignAyah = s === meta.surah && a === meta.ayah;
  const text = getAyah(s, a);

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
        <AyahText size={22} lineHeight={40} color={colors.white} style={{ marginTop: 8 }}>
          {text ? `${text} ${ayahEnd(a)}` : ayahPlaceholder(isDesignAyah ? meta.surahName : String(s), a)}
        </AyahText>
        {isDesignAyah ? <Caption color="rgba(255,255,255,0.8)">{meta.ref}</Caption> : null}
      </HeroCard>

      {ayahToday.sections.map((sec) => (
        <LinkDrawer key={sec.title} title={sec.title} count={sec.count} items={sec.items} more={sec.more} />
      ))}
    </Screen>
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

/** A collapsible group of typed links (التفسير، الأحاديث …), each with source and review status. */
function LinkDrawer({ title, count, items, more }: { title: string; count: string; items: LinkItem[]; more?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <GlassCard style={{ gap: 12 }}>
      <View style={[styles.between, { alignItems: 'center' }]}>
        <View style={[styles.row, { gap: 8 }]}>
          <Display size={22}>{title}</Display>
          <CountBadge value={count} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={open ? 'طيّ' : 'توسيع'} onPress={() => setOpen((v) => !v)} style={styles.ring}>
          <View style={{ transform: [{ rotate: open ? '0deg' : '90deg' }] }}>
            <Icon name="chevronDown" size={17} color={colors.ink} />
          </View>
        </Pressable>
      </View>
      {open
        ? items.map((it, i) => (
            <InnerCard key={i} style={{ gap: 6 }}>
              <View style={[styles.row, { gap: 8 }]}>
                <Display size={15}>{it.source}</Display>
                {it.status === 'reviewed' ? <ReviewedChip /> : <SuggestedChip />}
              </View>
              <Body size={14} color={colors.primary}>
                {it.body}
              </Body>
              <Caption>{it.meta}</Caption>
            </InnerCard>
          ))
        : null}
      {open && more ? (
        <Pressable accessibilityRole="button">
          <Squircle radius={30} fill="rgba(247,241,241,0.61)" stroke="#FFFFFF" glow="glass" style={styles.more}>
            <Body size={14} weight="bold" color={colors.ink}>
              {more}
            </Body>
          </Squircle>
        </Pressable>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  glassIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 37, height: 37, borderRadius: 18.5, borderWidth: 1, borderColor: colors.ring, alignItems: 'center', justifyContent: 'center' },
  more: { height: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
