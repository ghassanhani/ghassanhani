import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { GlassCard, HeroCard } from '@/components/ui';
import { library as l } from '@/content/design';
import { colors } from '@/theme/tokens';

export default function LibraryScreen() {
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
            onPress={() => (s.title === 'الحديث' ? router.push('/hadith/bukhari-8') : undefined)}
          >
            <GlassCard style={styles.shelf}>
              <Display size={21}>{s.title}</Display>
              <Body size={12} color={colors.primary} lineHeight={17}>
                {s.meta}
              </Body>
              <View style={{ marginTop: 'auto', gap: 8 }}>
                {/* coverage meter: share of links reviewed by scholars */}
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${s.coverageFraction * 100}%` }]} />
                </View>
                <Body size={12} weight="medium" color={colors.primary} lineHeight={16}>
                  {s.coverage}
                </Body>
              </View>
            </GlassCard>
          </Pressable>
        ))}
      </View>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  cell: { width: '48.3%' },
  shelf: { height: 165, padding: 20, gap: 4 },
  track: { height: 17, borderRadius: 9, backgroundColor: 'rgba(129,130,144,0.3)', overflow: 'hidden', flexDirection: 'row', boxShadow: 'inset 4px 4px 4px -1px rgba(0,0,0,0.12)' },
  fill: { borderRadius: 9, backgroundColor: 'rgba(51,95,89,0.5)', boxShadow: '0 0 6px rgba(51,95,89,0.5)' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  arrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
