import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/theme/tokens';
import { Icon } from './Icon';
import { Squircle } from './Squircle';
import { Body, Caption, Display } from './Typography';
import { HeroCard, InnerCard } from './ui';

/** «الفقه ‹ الطهارة ‹ الوضوء» — first crumb is a link back. */
export function Breadcrumbs({ items }: { items: string[] }) {
  return (
    <View accessibilityRole="header" style={styles.crumbs}>
      {items.map((c, i) => (
        <View key={c} style={styles.row}>
          {i ? <Icon name="chevronLeft" size={14} color={colors.muted} /> : null}
          <Body size={13} weight="medium" color={i === 0 ? colors.primary : colors.muted}>
            {c}
          </Body>
        </View>
      ))}
    </View>
  );
}

/** Row of white stat tiles: big number + caption. */
export function StatTiles({ items }: { items: { n: string; label: string }[] }) {
  return (
    <View style={[styles.row, { gap: 8 }]}>
      {items.map((s) => (
        <InnerCard key={s.label} style={styles.tile}>
          <Display size={24} lineHeight={30}>
            {s.n}
          </Display>
          <Caption>{s.label}</Caption>
        </InnerCard>
      ))}
    </View>
  );
}

/** White linked row (solid card) with trailing chevron when it navigates. */
export function LinkRow({ route, children, gap = 4 }: { route?: string | null; children: ReactNode; gap?: number }) {
  const body = (
    <InnerCard style={[styles.row, { gap: 12 }]}>
      <View style={{ flex: 1, gap }}>{children}</View>
      {route ? <Icon name="chevronLeft" size={20} color={colors.ink} /> : null}
    </InnerCard>
  );
  return route ? (
    <Pressable accessibilityRole="link" onPress={() => router.push(route as never)}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

/** Green hero card that links on (topic of the week / related module). */
export function HeroLink({ label, title, sub, route }: { label: string; title: string; sub?: string; route?: string }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => route && router.push(route as never)}>
      <HeroCard hero="forest" style={{ gap: 2 }}>
        <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
          <Body size={12} weight="medium" color="rgba(255,255,255,0.85)">
            {label}
          </Body>
          <Squircle radius={20} fill="#9ACD6A" glow="button" style={styles.arrow}>
            <View style={{ transform: [{ rotate: '-45deg' }] }}>
              <Icon name="arrowRight" size={22} color={colors.white} />
            </View>
          </Squircle>
        </View>
        <Display size={22} color={colors.white}>
          {title}
        </Display>
        {sub ? <Caption color="rgba(255,255,255,0.8)">{sub}</Caption> : null}
      </HeroCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  crumbs: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: -6 },
  tile: { flex: 1, alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 12 },
  arrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
