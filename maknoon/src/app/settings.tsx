import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { AyahText, Body, Caption, Display } from '@/components/Typography';
import { CountBadge, GlassCard, InnerCard, Segmented, Stepper, Switch } from '@/components/ui';
import { settings as S } from '@/content/account';
import { downloadPack, isInstalled, packs, packsDownloadable, packsSupported, removePack } from '@/content/packs';
import { credits } from '@/content/sources';
import { MADHHAB_NAMES, usePrefs } from '@/store/prefs';
import { APP_NAME } from '@/config';
import { METHODS, cityByKey } from '@/content/prayer';
import { ar, basmala } from '@/content/quran';
import { semanticEnabled } from '@/search/semantic';
import { colors } from '@/theme/tokens';

/** Settings — every choice is saved on the device (src/store/prefs.ts). */
export default function SettingsScreen() {
  const [prefs, setPrefs] = usePrefs();
  const size = prefs.quranSize;
  const setSize = (f: (s: number) => number) => setPrefs((p) => ({ quranSize: f(p.quranSize) }));
  const tashkeel = prefs.hideTashkeel;
  const setTashkeel = (v: boolean) => setPrefs({ hideTashkeel: v });
  const theme = prefs.theme as string;
  const setTheme = (v: string) => setPrefs({ theme: v as typeof prefs.theme });
  const notifs = prefs.notifs;
  const setNotifs = (f: (a: boolean[]) => boolean[]) => setPrefs((p) => ({ notifs: f(p.notifs) }));
  const suggested = prefs.showSuggested;
  const setSuggested = (v: boolean) => setPrefs({ showSuggested: v });
  const city = cityByKey(prefs.city);
  const methodName = METHODS.find((m) => m.key === (prefs.prayerMethod ?? city.method))?.name ?? '';
  const preview = basmala(); // canonical text from the source file, never typed
  const meaning = prefs.meaningSearch;
  const setMeaning = (v: boolean) => setPrefs({ meaningSearch: v });
  const analytics = prefs.analytics;
  const setAnalytics = (v: boolean) => setPrefs({ analytics: v });
  const asrSub = prefs.asr === 'h' ? 'الحنفي (ظل المثلين)' : 'الجمهور (ظل المثل)';
  const madhhabSub = prefs.madhhab === 'all' ? S.content.madhhab.sub : `${MADHHAB_NAMES[prefs.madhhab]} · تبقى المذاهب كلها ظاهرة`;

  return (
    <Screen backdrop="sand" withTabBar={false} header={<PageHeader title={S.title} fallback="/me" />}>
      <Display size={21.5}>{S.reading.title}</Display>
      <GlassCard style={{ gap: 12 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <View style={[styles.row, { gap: 8 }]}>
            <Display size={16}>{S.reading.size}</Display>
            <CountBadge value={ar(size)} />
          </View>
          <View style={{ width: 140 }}>
            <Stepper label={S.reading.size} value="" onDec={() => setSize((s) => Math.max(16, s - 2))} onInc={() => setSize((s) => Math.min(40, s + 2))} />
          </View>
        </View>
        <InnerCard style={{ alignItems: 'center' }}>
          <AyahText size={size} lineHeight={size * 1.9} style={preview ? { fontFamily: preview.fontFamily } : null}>
            {preview?.text ?? ''}
          </AyahText>
        </InnerCard>
        <ToggleRow title={S.reading.tashkeel.title} sub={S.reading.tashkeel.sub} value={tashkeel} onChange={setTashkeel} />
        <Display size={16}>{S.reading.theme.title}</Display>
        <Segmented options={S.reading.theme.options.map(([value, label]) => ({ value, label }))} value={theme} onChange={setTheme} />
      </GlassCard>

      <Display size={21.5}>{S.prayer.title}</Display>
      <GlassCard style={{ paddingVertical: 8 }}>
        <LinkItem first title={S.prayer.method.title} sub={methodName} route="/prayer" />
        <LinkItem title={S.prayer.asr.title} sub={asrSub} route="/prayer" />
        <LinkItem title={S.prayer.location.title} sub={`${city.name} · مدينة محددة`} route="/prayer" />
      </GlassCard>

      <Display size={21.5}>{S.notifications.title}</Display>
      <GlassCard style={{ paddingVertical: 8 }}>
        {S.notifications.items.map((n, i) => (
          <Fragment key={n.title}>
            {i ? <View style={styles.sep} /> : null}
            <ToggleRow title={n.title} sub={n.sub} value={notifs[i]} onChange={(v) => setNotifs((a) => a.map((x, j) => (j === i ? v : x)))} />
          </Fragment>
        ))}
      </GlassCard>

      <Display size={21.5}>{S.content.title}</Display>
      <GlassCard style={{ paddingVertical: 8 }}>
        <LinkItem first title={S.content.madhhab.title} sub={madhhabSub} route="/onboarding" />
        <LinkItem title={S.content.lang.title} sub={S.content.lang.sub} route="/onboarding" />
        <View style={styles.sep} />
        <ToggleRow title={S.content.suggested.title} sub={S.content.suggested.sub} value={suggested} onChange={setSuggested} />
      </GlassCard>

      <Display size={21.5}>حزم التفسير</Display>
      <GlassCard style={{ paddingVertical: 8 }}>
        {packs.map((p, i) => (
          <Fragment key={p.slug}>
            {i ? <View style={styles.sep} /> : null}
            <PackRow slug={p.slug} title={p.title} bytes={p.bytes} bundled={p.bundled} installed={packsSupported && isInstalled(p.slug)} />
          </Fragment>
        ))}
        <Caption style={{ paddingVertical: 8 }}>
          {!packsSupported
            ? 'الحزم الكاملة متاحة في تطبيق iOS وAndroid؛ نسخة الويب تعرض العيّنة فقط.'
            : packsDownloadable
              ? 'تُنزَّل كل حزمة مرة واحدة وتعمل دون اتصال · نص التفسير كما نُشر (CC BY-ND).'
              : 'التنزيل غير مفعّل بعد: لم يُضبط رابط استضافة الحزم.'}
        </Caption>
      </GlassCard>

      <Display size={21.5}>{S.privacy.title}</Display>
      <GlassCard style={{ gap: 6 }}>
        {S.privacy.lines.map((l) => (
          <View key={l} style={[styles.row, { gap: 8 }]}>
            <Icon name="badge" size={16} color={colors.primary} />
            <Body size={14}>{l}</Body>
          </View>
        ))}
        <View style={styles.sep} />
        <ToggleRow title={S.privacy.analytics.title} sub={S.privacy.analytics.sub} value={analytics} onChange={setAnalytics} />
        {semanticEnabled ? (
          <ToggleRow
            title="البحث بالمعنى"
            sub={`يرسل عبارة البحث وحدها إلى خادم ${APP_NAME} لترتيب النتائج بالمعنى. لا تُحفظ ولا تُسجَّل. عند الإيقاف يبقى البحث كله على جهازك.`}
            value={meaning}
            onChange={setMeaning}
          />
        ) : null}
      </GlassCard>

      <Display size={21.5}>{S.trust.title}</Display>
      <GlassCard style={{ paddingVertical: 8 }}>
        <LinkItem first title={S.trust.method.title} sub={S.trust.method.sub} />
        <LinkItem title={S.trust.report.title} sub={S.trust.report.sub} />
        <View style={[styles.sep, { marginBottom: 8 }]} />
        <Display size={16} style={{ marginBottom: 4 }}>
          {S.trust.creditsTitle}
        </Display>
        {credits().map((c) => (
          <View key={c.name} style={[styles.row, { justifyContent: 'space-between', gap: 10, paddingVertical: 6 }]}>
            <Body size={13} style={{ flex: 1 }}>
              {c.name}
            </Body>
            <Caption>{c.terms}</Caption>
          </View>
        ))}
      </GlassCard>

      <Body size={12} weight="medium" color="#7A5C24" style={{ paddingHorizontal: 6 }}>
        {S.disclaimer}
      </Body>
      <Caption style={{ textAlign: 'center' }}>{S.version}</Caption>
    </Screen>
  );
}

function PackRow({ slug, title, bytes, bundled, installed }: { slug: string; title: string; bytes: number; bundled: boolean; installed: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mb = `${(bytes / 1e6).toFixed(1)} م.ب`;
  const act = async () => {
    setBusy(true);
    setError(null);
    try {
      if (installed) await removePack(slug);
      else await downloadPack(slug);
    } catch (e) {
      setError(e instanceof Error && e.message === 'Checksum mismatch' ? 'فشل التحقق من الملف، لم يُحفظ.' : 'تعذّر التنزيل. حاول لاحقًا.');
    } finally {
      setBusy(false);
    }
  };
  const canAct = packsSupported && !bundled && (installed || packsDownloadable);
  return (
    <View style={[styles.row, { gap: 12, paddingVertical: 12 }]}>
      <View style={{ flex: 1 }}>
        <Display size={16}>{title}</Display>
        <Caption>{bundled ? `مضمّنة في التطبيق · ${mb}` : installed ? `منزّلة · ${mb}` : mb}</Caption>
        {error ? <Caption color="#B4532A">{error}</Caption> : null}
      </View>
      {busy ? (
        <ActivityIndicator color={colors.primary} />
      ) : canAct ? (
        <Pressable accessibilityRole="button" onPress={act} style={styles.packBtn}>
          <Body size={13} weight="bold" color={colors.primary}>
            {installed ? 'إزالة' : 'تنزيل'}
          </Body>
        </Pressable>
      ) : null}
    </View>
  );
}

function ToggleRow({ title, sub, value, onChange }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={[styles.row, { gap: 12, minHeight: 60, paddingVertical: 8 }]}>
      <View style={{ flex: 1 }}>
        <Display size={16}>{title}</Display>
        <Caption>{sub}</Caption>
      </View>
      <Switch label={title} value={value} onChange={onChange} />
    </View>
  );
}

function LinkItem({ title, sub, route, first }: { title: string; sub: string; route?: string; first?: boolean }) {
  return (
    <Fragment>
      {!first ? <View style={styles.sep} /> : null}
      <Pressable accessibilityRole="button" disabled={!route} onPress={() => route && router.push(route as never)} style={[styles.row, { gap: 12, paddingVertical: 12 }]}>
        <View style={{ flex: 1 }}>
          <Display size={16}>{title}</Display>
          <Body size={13} color={colors.primary}>
            {sub}
          </Body>
        </View>
        {route ? <Icon name="chevronLeft" size={20} color={colors.ink} /> : null}
      </Pressable>
    </Fragment>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  sep: { height: 1, backgroundColor: colors.hairline },
  packBtn: { height: 36, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
