import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { GlassCard, HeroCard } from '@/components/ui';
import { search as s } from '@/content/design';
import { F } from '@/theme/fonts';
import { colors, space } from '@/theme/tokens';

/**
 * Unified search: diacritics-insensitive, root-aware, filtered by module.
 * Results shown are the design's sample for «رحم».
 */
export default function SearchScreen() {
  const [query, setQuery] = useState(s.query);
  const [filter, setFilter] = useState(0);

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
        {s.filters.map((f, i) => {
          const on = i === filter;
          return (
            <Pressable key={f} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setFilter(i)}>
              <Squircle
                radius={21}
                fill={on ? colors.primary : 'rgba(255,255,255,0.7)'}
                glow={on ? 'button' : 'glass'}
                stroke={on ? undefined : '#FFFFFF'}
                style={styles.filter}
              >
                <Body size={14} weight={on ? 'bold' : 'medium'} color={on ? colors.white : colors.ink} lineHeight={20}>
                  {f}
                </Body>
              </Squircle>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Root card */}
      <GlassCard style={{ gap: 12 }}>
        <View style={[styles.row, { gap: 10 }]}>
          <Display size={22}>{s.root.letters}</Display>
          <Squircle radius={12} fill={colors.white} style={styles.note}>
            <Body size={12} color={colors.primary} lineHeight={18}>
              {s.root.note}
            </Body>
          </Squircle>
        </View>
        <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
          {s.root.words.map((w) => (
            <Squircle key={w} radius={20} fill="rgba(206,225,228,0.6)" glow="glass" style={styles.word}>
              <AyahText size={16} lineHeight={30}>
                {w}
              </AyahText>
            </Squircle>
          ))}
        </View>
      </GlassCard>

      {/* Ayah hit */}
      <Pressable accessibilityRole="button">
        <GlassCard style={{ gap: 4 }}>
          <View style={styles.between}>
            <Display size={20}>{s.ayah.label}</Display>
            <Caption>{s.ayah.ref}</Caption>
          </View>
          <AyahText size={22} lineHeight={42}>
            {s.ayah.text}
          </AyahText>
        </GlassCard>
      </Pressable>

      {/* Hadith hit */}
      <Pressable accessibilityRole="button" onPress={() => router.push('/hadith/bukhari-8')}>
        <GlassCard style={{ gap: 4 }}>
          <View style={styles.between}>
            <Display size={20}>{s.hadith.label}</Display>
            <Caption>{s.hadith.ref}</Caption>
          </View>
          <Display size={18} lineHeight={34}>
            {s.hadith.text}
          </Display>
        </GlassCard>
      </Pressable>

      {/* Assistant — retrieval-only, never a fatwa */}
      <HeroCard hero="forest" style={{ gap: 8 }}>
        <Display size={22} color={colors.white}>
          {s.assistant.title}
        </Display>
        <Body size={13} color="rgba(255,255,255,0.9)" lineHeight={20}>
          {s.assistant.note}
        </Body>
        <Squircle radius={24} fill={colors.white} style={styles.ask}>
          <TextInput
            placeholder={s.assistant.placeholder}
            placeholderTextColor={colors.muted}
            style={[styles.input, { fontFamily: F.sans, fontSize: 15 }]}
            accessibilityLabel={s.assistant.placeholder}
          />
        </Squircle>
      </HeroCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  field: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingStart: 20, paddingEnd: 13 },
  input: { flex: 1, minWidth: 0, fontSize: 18, color: colors.inkDeep, writingDirection: 'rtl', textAlign: 'right', paddingVertical: 0 },
  clear: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  rail: { marginHorizontal: -space.gutter, flexGrow: 0 },
  railContent: { paddingHorizontal: space.gutter, gap: 9, paddingVertical: 2 },
  filter: { height: 42, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  note: { height: 26, paddingHorizontal: 9, justifyContent: 'center' },
  word: { height: 40, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ask: { height: 46, paddingHorizontal: 18, justifyContent: 'center', marginTop: 6 },
});
