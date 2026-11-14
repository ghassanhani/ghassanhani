import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { atStart } from '@/components/motion';
import { Body, Caption, Display } from '@/components/Typography';
import { GlassCard, HeroCard } from '@/components/ui';
import { library as l } from '@/content/design';
import { hadithIndex } from '@/content/hadith';
import { isInstalled, packs } from '@/content/packs';
import { ar } from '@/content/quran';
import { adhkar, adhkarOrder } from '@/content/worship';
import { usePrefs } from '@/store/prefs';
import { colors } from '@/theme/tokens';

// Each shelf opens its module's sample screen from the canvas.
const SHELF_ROUTES: Record<string, string> = {
  الحديث: '/hadith',
  التفسير: '/tafsir',
  'الفقه وأصوله': '/fiqh-index',
  'السيرة والتاريخ': '/shelf/seerah',
  العقيدة: '/shelf/aqeedah',
  'التزكية والأخلاق': '/shelf/tazkiyah',
  'علوم العربية': '/shelf/arabic',
  الأذكار: '/adhkar',
};

/**
 * What each shelf really holds today (the design's filler line and «٣٠٪» were the same on every
 * shelf). The meter is the share of links a scholar has reviewed (CLAUDE.md rule 4): none yet, so
 * it reads «لم يُراجَع بعد» with an empty bar until reviews exist.
 */
function shelfMeta(title: string): string {
  switch (title) {
    case 'الحديث':
      return `${ar(hadithIndex.books.length)} كتابًا · ${ar(hadithIndex.books.reduce((n, b) => n + b.count, 0).toLocaleString('en').replace(/,/g, '٬'))} حديثًا`;
    case 'التفسير': {
      const have = packs.filter((p) => isInstalled(p.slug)).length;
      return `${ar(packs.length)} تفاسير · ${ar(have)} على جهازك`;
    }
    case 'الأذكار':
      return `${ar(adhkarOrder.reduce((n, c) => n + adhkar[c].items.length, 0))} ذكرًا من مصادرها`;
    case 'العقيدة':
      return 'الإيمان والتوحيد والقدر من كتب الحديث';
    case 'التزكية والأخلاق':
      return 'الأدب المفرد والرقائق والبر';
    case 'السيرة والتاريخ':
      return 'الشمائل والمغازي والمناقب';
    case 'علوم العربية':
      return 'قريبًا · بانتظار مصدر مرخّص';
    case 'الفقه وأصوله':
      return 'أحاديث الأحكام · المسائل قيد البناء';
    default:
      return 'نموذج أولي · قيد البناء';
  }
}

export default function LibraryScreen() {
  usePrefs(); // installed tafsir packs can change in Settings
  return (
    <Screen backdrop="sea">
      <Display size={30} lineHeight={44} style={{ marginTop: 8 }}>
        {l.title}
      </Display>

      <View style={styles.grid}>
        {l.shelves.map((s) => (
          <Pressable
            key={s.title}
            accessibilityRole="button"
            style={styles.cell}
            onPress={() => {
              const to = SHELF_ROUTES[s.title];
              if (to) router.push(to as never);
            }}
          >
            <GlassCard style={styles.shelf}>
              <Display size={21}>{s.title}</Display>
              <Body size={12} color={colors.primary} lineHeight={17}>
                {shelfMeta(s.title)}
              </Body>
              <View style={{ marginTop: 'auto', gap: 8 }}>
                {/* coverage meter: share of links reviewed by scholars */}
                <View style={styles.track}>
                  {/* the design's frosted glass fill (soft inner light, grain), as the wird bar on Home */}
                  {REVIEWED > 0 ? <Squircle radius={9} fill="rgba(51,95,89,0.82)" glow="frost" noise={51.2} style={[styles.fill, atStart(0), { width: `${REVIEWED * 100}%` }]} /> : null}
                </View>
                <Body size={12} weight="medium" color={colors.primary} lineHeight={16}>
                  {REVIEWED > 0 ? `${ar(Math.round(REVIEWED * 100))}٪ مُراجَع` : 'لم يُراجَع بعد'}
                </Body>
              </View>
            </GlassCard>
          </Pressable>
        ))}
      </View>

      <Pressable accessibilityRole="link" onPress={() => router.push('/path')}>
      <HeroCard hero="forest" style={{ minHeight: 139, gap: 2 }}>
        <View style={styles.between}>
          <Body size={12} weight="medium" color="rgba(255,255,255,0.85)">
            {l.path.label}
          </Body>
          <Squircle radius={20} fill="#9ACD6A" glow="button" style={styles.arrow}>
            <View style={{ transform: [{ rotate: '-45deg' }] }}>
              <Icon name="arrowRight" size={22} color={colors.white} />
            </View>
          </Squircle>
        </View>
        <Display size={22} color={colors.white}>
          {l.path.title}
        </Display>
        <Caption color="rgba(255,255,255,0.75)">{l.path.meta}</Caption>
      </HeroCard>
      </Pressable>
    </Screen>
  );
}

// share of links reviewed by a scholar: no reviews have been made yet
const REVIEWED = 0;

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  cell: { width: '48.3%' },
  shelf: { height: 165, padding: 20, gap: 4 },
  track: { height: 17, borderRadius: 9, borderCurve: 'continuous', backgroundColor: 'rgba(129,130,144,0.3)', boxShadow: 'inset 4px 4px 4px -1px rgba(0,0,0,0.12)' },
  // fills from where the line starts (the right in Arabic): `atStart`, because native RTL swaps left/right
  fill: { position: 'absolute', top: 0, bottom: 0 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  arrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
