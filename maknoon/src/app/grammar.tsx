import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { Breadcrumbs, LinkRow } from '@/components/blocks';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { Chip, CountBadge, GlassCard, InnerCard, ReviewedChip, SoftButton } from '@/components/ui';
import { grammar as G } from '@/content/modules';
import { colors } from '@/theme/tokens';

export default function GrammarScreen() {
  return (
    <Screen backdrop="sea" withTabBar={false} header={<PageHeader title={G.title} fallback="/library" />}>
      <Breadcrumbs items={G.crumbs} />

      <GlassCard tint="neutral" style={{ gap: 14 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Caption style={{ fontSize: 13, flex: 1 }}>{G.label}</Caption>
          <ReviewedChip />
        </View>
        <Display size={44} lineHeight={52}>
          {G.rule}
        </Display>
        <InnerCard style={{ alignItems: 'center' }}>
          <Display size={23} color={colors.primary} lineHeight={38}>
            {G.quote}
          </Display>
        </InnerCard>
      </GlassCard>

      <Display size={21.5}>{G.opinionsTitle}</Display>
      <View style={[styles.row, { gap: 12, alignItems: 'stretch' }]}>
        {G.opinions.map((o) => (
          <GlassCard key={o.school} style={{ flex: 1, padding: 16, gap: 8 }}>
            {o.tone === 'num' ? <CountBadge value={o.school} /> : <Chip label={o.school} tone="suggested" />}
            <Display size={20}>{o.verdict}</Display>
            <Body size={13} color="#4A4B57" lineHeight={21}>
              {o.note}
            </Body>
          </GlassCard>
        ))}
      </View>

      <GlassCard style={{ gap: 12 }}>
        <Display size={21.5}>{G.examplesTitle}</Display>
        {G.examples.map((e) => (
          <LinkRow key={e.word} route={e.route}>
            <View style={[styles.row, { gap: 14 }]}>
              <AyahText size={28} lineHeight={50} style={{ minWidth: 96, textAlign: 'center' }}>
                {e.word}
              </AyahText>
              <View style={{ flex: 1 }}>
                <Body size={13} weight="medium" color={colors.primary}>
                  {e.ref}
                </Body>
                <Body size={14} color="#4A4B57">
                  {e.note}
                </Body>
              </View>
            </View>
          </LinkRow>
        ))}
        <SoftButton label={G.more} />
      </GlassCard>

      <GlassCard tint="peach" style={{ gap: 8 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Caption style={{ fontSize: 13 }}>{G.lexicon.source}</Caption>
          <Display size={20} color={colors.primary}>
            {G.lexicon.root}
          </Display>
        </View>
        <Body size={15} color="#4A4B57">
          {G.lexicon.excerpt}
        </Body>
        <Caption>{G.lexicon.ref}</Caption>
      </GlassCard>

      <GlassCard tint="lavender" style={{ gap: 4 }}>
        <Display size={21.5} style={{ marginBottom: 6 }}>
          {G.matnTitle}
        </Display>
        {G.matn.map((m, i) => (
          <Fragment key={m.title}>
            {i ? <View style={styles.hairline} /> : null}
            <View style={[styles.row, { paddingVertical: 10 }]}>
              <View style={{ flex: 1 }}>
                <Display size={17}>{m.title}</Display>
                <Body size={14} color={colors.primary}>
                  {m.meta}
                </Body>
              </View>
              {m.link ? <Icon name="chevronLeft" size={20} color={colors.ink} /> : null}
            </View>
          </Fragment>
        ))}
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  hairline: { height: 1, backgroundColor: colors.hairline },
});
