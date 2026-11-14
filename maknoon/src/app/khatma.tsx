import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Body, Caption, Display } from '@/components/Typography';
import { Cta, GlassCard, HeroCard, IconBubble, InnerCard, ProgressBar, Segmented, SoftButton, Stepper, Switch } from '@/components/ui';
import { ar, getAyah } from '@/content/quran';
import { bookMeta } from '@/content/hadith';
import { quranIndex } from '@/content/worship';
import { getPrefs, usePrefs } from '@/store/prefs';
import { type Plan, type Wird, juzOfPage, markWird, planLabel, planWirds, setReminder, startKhatma, stopKhatma, useKhatma, wirdEnds, wirdRange } from '@/store/khatma';
import { MadinahAyah } from '@/components/MadinahAyah';
import { juzNameVoweled, readingAt } from '@/store/reading';
import { colors, space } from '@/theme/tokens';
import { askAlertPermission } from '@/worship/prayerAlerts';

const day = (t: number) => ar(new Date(t).toLocaleDateString('en-GB'));
const openPage = (page: number) => router.push({ pathname: '/mushaf', params: { page: String(page) } });
const hourLabel = (h: number) => `${ar(h % 12 === 0 ? 12 : h % 12)}:٠٠ ${h < 12 ? 'ص' : 'م'}`;

/**
 * الختمة: plan a khatma (where to start; a number of days or a daily amount — juz, hizb or pages),
 * then today's wird, the wirds read and to come, a daily reminder, and plain statistics. Everything
 * stays on the device; progress is shown plainly, with no streaks.
 */
export default function KhatmaScreen() {
  const { k, today, history, seconds } = useKhatma();
  return (
    <Screen backdrop="mint" withTabBar={false} header={<PageHeader title="الختمة" fallback="/quran" />}>
      {k && today ? <Current /> : <Setup />}
      <Sunan />
      <SunanAlerts />
      <Stats count={history.length} last={history[history.length - 1]?.finishedAt ?? null} seconds={seconds} />
      {k ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const go = () => stopKhatma();
            if (Platform.OS === 'web') return go();
            Alert.alert('بدء ختمة جديدة', 'ستُلغى الختمة الحالية ولا تُحسب. هل تريد البدء من جديد؟', [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'ابدأ من جديد', style: 'destructive', onPress: go },
            ]);
          }}
        >
          <Body size={14} weight="bold" color={colors.primary} style={{ textAlign: 'center', paddingVertical: 6 }}>
            بدء ختمة جديدة
          </Body>
        </Pressable>
      ) : null}
    </Screen>
  );
}

/** A new khatma: where to start, and how to divide it. */
function Setup() {
  const reading = readingAt(getPrefs().lastPage);
  const [from, setFrom] = useState<'start' | 'here' | 'juz'>('start');
  const [juz, setJuz] = useState(1);
  const [by, setBy] = useState<'days' | 'amount'>('days');
  const [days, setDays] = useState(30);
  const [unit, setUnit] = useState<'juz' | 'hizb' | 'pages'>('juz');
  const [amount, setAmount] = useState(1);
  const start = from === 'start' ? 1 : from === 'here' ? reading.page : quranIndex.juz[juz - 1].page;
  const plan: Plan = by === 'days' ? { start, unit: 'days', amount: days } : { start, unit, amount };
  const n = planWirds(plan).length;
  return (
    // its cards spaced as the screen spaces its own
    <View style={{ gap: space.gap }}>
      <HeroCard hero="teal" style={{ gap: 6 }}>
        <Display size={24} color={colors.white}>
          ختمة جديدة
        </Display>
        <Body size={13} color="rgba(255,255,255,0.85)">
          اختر من أين تبدأ وكيف تقسم المصحف، ويعطيك كل يوم ورده.
        </Body>
      </HeroCard>

      <GlassCard style={{ gap: 12 }}>
        <Display size={17}>البدء من</Display>
        <Segmented
          options={[
            { value: 'start', label: 'أول المصحف' },
            { value: 'here', label: 'موضع قراءتي' },
            { value: 'juz', label: 'جزء' },
          ]}
          value={from}
          onChange={setFrom}
        />
        {from === 'juz' ? <Stepper label="الجزء" value={`الجزء ${ar(juz)}`} onDec={() => setJuz((j) => Math.max(1, j - 1))} onInc={() => setJuz((j) => Math.min(30, j + 1))} /> : null}
        <Caption>{from === 'here' ? `صفحة ${ar(reading.page)} · ${reading.surahName}` : `صفحة ${ar(start)}`}</Caption>
      </GlassCard>

      <GlassCard style={{ gap: 12 }}>
        <Display size={17}>الخطة</Display>
        <Segmented
          options={[
            { value: 'days', label: 'بالمدة' },
            { value: 'amount', label: 'بمقدار الورد' },
          ]}
          value={by}
          onChange={setBy}
        />
        {by === 'days' ? (
          <Stepper label="مدة الختمة" value={`${ar(days)} يومًا`} onDec={() => setDays((d) => Math.max(3, d - (d > 60 ? 10 : 1)))} onInc={() => setDays((d) => Math.min(365, d + (d >= 60 ? 10 : 1)))} />
        ) : (
          <>
            <Segmented
              options={[
                { value: 'juz', label: 'جزء' },
                { value: 'hizb', label: 'حزب' },
                { value: 'pages', label: 'صفحات' },
              ]}
              value={unit}
              onChange={(u) => {
                setUnit(u);
                setAmount(u === 'pages' ? 10 : 1);
              }}
            />
            <Stepper
              label="كمية الورد"
              value={unit === 'pages' ? `${ar(amount)} صفحات` : `${ar(amount)} ${unit === 'juz' ? 'جزء' : 'حزب'}`}
              onDec={() => setAmount((a) => Math.max(1, a - 1))}
              onInc={() => setAmount((a) => Math.min(unit === 'pages' ? 60 : unit === 'juz' ? 10 : 20, a + 1))}
            />
          </>
        )}
        <InnerCard>
          <Body size={14} weight="bold" color={colors.primary}>
            {planLabel(plan)}
          </Body>
          <Caption>{`${ar(n)} وردًا · تنتهي ${n === 1 ? 'اليوم' : `بعد ${ar(n)} يومًا`} إن قرأت وردًا كل يوم`}</Caption>
        </InnerCard>
        <Cta label="ابدأ الختمة" onPress={() => startKhatma(plan)} />
      </GlassCard>
    </View>
  );
}

/** The khatma being read. */
function Current() {
  const { k, wirds, today } = useKhatma();
  const [open, setOpen] = useState<'past' | 'next' | null>(null);
  if (!k || !today) return null;
  const read = wirds.slice(0, k.done).reduce((n, w) => n + w.pages, 0);
  return (
    // its cards spaced as the screen spaces its own
    <View style={{ gap: space.gap }}>
      <HeroCard hero="teal" style={{ gap: 10 }}>
        <View style={styles.between}>
          <Display size={24} color={colors.white}>
            ختمتي
          </Display>
          <Body size={13} color={colors.gold} weight="medium">{`الورد ${ar(k.done + 1)} من ${ar(wirds.length)}`}</Body>
        </View>
        <Caption color="rgba(255,255,255,0.8)">{`${planLabel(k.plan)} · بدأت ${day(k.startedAt)}`}</Caption>
        <ProgressBar value={read / 604} height={10} fill={colors.white} track="#FFFFFF" trackOpacity={0.25} />
        <Caption color="rgba(255,255,255,0.8)">{`${ar(read)} من ٦٠٤ صفحة`}</Caption>
      </HeroCard>

      <TodayWird w={today} done={k.done} total={wirds.length} read={read} />

      <GlassCard style={{ paddingVertical: 8 }}>
        <ListHead title="الأوراد السابقة" n={k.done} open={open === 'past'} onPress={() => setOpen(open === 'past' ? null : 'past')} />
        {open === 'past' ? wirds.slice(0, k.done).reverse().map((w) => <WirdRow key={w.index} w={w} note={k.doneAt[w.index] ? `قُرئ ${day(k.doneAt[w.index])}` : 'قُرئ'} />) : null}
        <View style={styles.sep} />
        <ListHead title="الأوراد القادمة" n={wirds.length - k.done - 1} open={open === 'next'} onPress={() => setOpen(open === 'next' ? null : 'next')} />
        {open === 'next' ? wirds.slice(k.done + 1).map((w) => <WirdRow key={w.index} w={w} />) : null}
      </GlassCard>

      <GlassCard style={{ gap: 10 }}>
        <View style={styles.between}>
          <View style={{ flex: 1 }}>
            <Display size={16}>منبّه الورد اليومي</Display>
            <Caption>{k.remind !== null ? `كل يوم ${hourLabel(k.remind)}` : 'متوقف'}</Caption>
          </View>
          <Switch
            label="منبّه الورد اليومي"
            value={k.remind !== null}
            onChange={(on) => {
              setReminder(on ? 20 : null);
              if (on) void askAlertPermission();
            }}
          />
        </View>
        {k.remind !== null ? (
          <Stepper label="وقت التنبيه" value={hourLabel(k.remind)} onDec={() => setReminder(((k.remind ?? 20) + 23) % 24)} onInc={() => setReminder(((k.remind ?? 20) + 1) % 24)} />
        ) : null}
      </GlassCard>
    </View>
  );
}

/** Today's wird: its opening ayah, the juz, where it begins and ends, and the khatma's progress. */
function TodayWird({ w, done, total, read }: { w: Wird; done: number; total: number; read: number }) {
  const { first, last } = wirdEnds(w);
  // the opening ayah; a short one is followed by the next, as the printed wird cards do
  const second = (getAyah(first.surah, first.ayah)?.text.length ?? 99) < 60 && first.ayah < (quranIndex.surahs[first.surah - 1]?.ayat ?? 0);
  const name = (n: number) => quranIndex.surahs[n - 1]?.name ?? '';
  return (
    <GlassCard style={{ gap: 12 }}>
      <View style={styles.between}>
        <Display size={18}>ورد اليوم</Display>
        <Body size={13} weight="bold" color={colors.primary}>
          {juzNameVoweled(juzOfPage(w.from))}
        </Body>
      </View>
      <InnerCard style={{ gap: 6 }}>
        <Caption color={colors.primary}>من قوله تعالى</Caption>
        <MadinahAyah surah={first.surah} ayah={first.ayah} size={21} align="center" numberOfLines={second ? undefined : 3} />
        {second ? <MadinahAyah surah={first.surah} ayah={first.ayah + 1} size={21} align="center" /> : null}
      </InnerCard>
      <View style={styles.ends}>
        <View style={styles.between}>
          <Body size={14}>{`من سورة ${name(first.surah)} · آية ${ar(first.ayah)}`}</Body>
          <Caption>{`صفحة ${ar(w.from)}`}</Caption>
        </View>
        <View style={styles.sep} />
        <View style={styles.between}>
          <Body size={14}>{`إلى سورة ${name(last.surah)} · آية ${ar(last.ayah)}`}</Body>
          <Caption>{`صفحة ${ar(w.to)}`}</Caption>
        </View>
      </View>
      <View style={[styles.row, { gap: 10 }]}>
        <Cta label="اقرأ الورد" height={46} compact style={{ flex: 1 }} onPress={() => openPage(w.from)} />
        <SoftButton label="أتممت القراءة" onPress={markWird} />
      </View>
      <View style={{ gap: 6, marginTop: 4 }}>
        <Caption color={colors.ink}>الختمة الحالية</Caption>
        <ProgressBar value={read / 604} height={8} fill={colors.primary} track={colors.primary} trackOpacity={0.12} />
        <View style={styles.between}>
          <Caption>{`الأوراد السابقة: ${ar(done)}`}</Caption>
          <Caption>{`الأوراد القادمة: ${ar(Math.max(0, total - done - 1))}`}</Caption>
        </View>
      </View>
      <Caption>يُحسب الورد مقروءًا أيضًا حين تقلب الصفحة بعد آخر صفحاته في المصحف.</Caption>
    </GlassCard>
  );
}

function ListHead({ title, n, open, onPress }: { title: string; n: number; open: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onPress} style={[styles.between, { paddingVertical: 12 }]}>
      <Display size={16}>{title}</Display>
      <View style={[styles.row, { gap: 8 }]}>
        <View style={styles.count}>
          <Body size={13} weight="bold" color={colors.white} lineHeight={18}>
            {ar(Math.max(0, n))}
          </Body>
        </View>
        <Icon name={open ? 'chevronDown' : 'chevronLeft'} size={18} color={colors.ink} />
      </View>
    </Pressable>
  );
}

function WirdRow({ w, note }: { w: Wird; note?: string }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => openPage(w.from)} style={[styles.between, styles.wird]}>
      <View style={{ flex: 1 }}>
        <Body size={14}>{wirdRange(w)}</Body>
        <Caption>{`ص ${ar(w.from)}–${ar(w.to)}${note ? ` · ${note}` : ''}`}</Caption>
      </View>
      <Caption>{`الورد ${ar(w.index + 1)}`}</Caption>
    </Pressable>
  );
}

/**
 * «سنن قرآنية»: surahs the Sunnah singles out. Each opens in the mushaf; its virtue is not written
 * here but linked to the hadith itself (Sunnah.com, with its grading) — only hadith in the app's
 * books are cited (the Friday reading of al-Kahf is narrated outside them, so it is not claimed).
 */
const SUNAN: { surah: number; icon: 'bookmark' | 'bookOpen' | 'quran'; hadith: string; about: string }[] = [
  { surah: 18, icon: 'bookmark', hadith: 'muslim:809', about: 'حفظ العشر الأوائل منها' },
  { surah: 67, icon: 'bookOpen', hadith: 'tirmidhi:2891', about: 'تشفع لصاحبها' },
  { surah: 2, icon: 'quran', hadith: 'muslim:780', about: 'قراءتها في البيت' },
];
function Sunan() {
  return (
    <GlassCard style={{ paddingVertical: 8 }}>
      <Display size={17} style={{ paddingTop: 8, paddingBottom: 4 }}>
        سنن قرآنية
      </Display>
      {SUNAN.map((x) => {
        const s = quranIndex.surahs[x.surah - 1];
        const [slug, num] = x.hadith.split(':');
        return (
          <View key={x.surah} style={[styles.between, styles.stat, { gap: 10 }]}>
            <Pressable accessibilityRole="link" accessibilityLabel={`سورة ${s.name}`} onPress={() => openPage(s.page)} style={[styles.row, { gap: 12, flex: 1 }]}>
              <IconBubble name={x.icon} size={36} iconSize={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Display size={16}>{`سُورَةُ ${s.name}`}</Display>
                <Caption>{`${x.about} · صفحة ${ar(s.page)}`}</Caption>
              </View>
            </Pressable>
            <Pressable accessibilityRole="link" accessibilityLabel="الحديث في فضلها" hitSlop={6} onPress={() => router.push(`/hadith/${x.hadith}`)}>
              <Caption color={colors.primary}>{`${bookMeta(slug)?.name ?? ''} ${ar(num)} ‹`}</Caption>
            </Pressable>
          </View>
        );
      })}
    </GlassCard>
  );
}

/** «منبّهات السنن»: a daily reminder for al-Mulk and al-Baqarah, each with its own time. */
function SunanAlerts() {
  const [prefs, setPrefs] = usePrefs();
  const clock = (m: number) => `${ar(((Math.floor(m / 60) + 11) % 12) + 1)}:${ar(String(m % 60).padStart(2, '0'))} ${m < 720 ? 'ص' : 'م'}`;
  const set = (n: string, patch: Partial<{ on: boolean; at: number }>) =>
    setPrefs((p) => ({ sunanAlerts: { ...p.sunanAlerts, [n]: { ...(p.sunanAlerts[n] ?? { on: false, at: 21 * 60 }), ...patch } } }));
  return (
    <GlassCard style={{ paddingVertical: 8 }}>
      <Display size={17} style={{ paddingTop: 8, paddingBottom: 4 }}>
        منبّهات السنن
      </Display>
      {(['67', '2'] as const).map((n) => {
        const a = prefs.sunanAlerts[n] ?? { on: false, at: 21 * 60 };
        const name = quranIndex.surahs[Number(n) - 1]?.name ?? '';
        return (
          <View key={n} style={[styles.stat, { gap: 10 }]}>
            <View style={styles.between}>
              <View style={[styles.row, { gap: 10, flex: 1 }]}>
                <Icon name="bell" size={20} color={colors.primary} />
                <Display size={16}>{`منبّه سُورَةُ ${name}`}</Display>
              </View>
              <Switch
                label={`منبّه سورة ${name}`}
                value={a.on}
                onChange={(on) => {
                  set(n, { on });
                  if (on) void askAlertPermission();
                }}
              />
            </View>
            {a.on ? <Stepper label={`وقت سورة ${name}`} value={clock(a.at)} onDec={() => set(n, { at: (a.at + 1410) % 1440 })} onInc={() => set(n, { at: (a.at + 30) % 1440 })} /> : <Caption>{`كل يوم ${clock(a.at)} · متوقف`}</Caption>}
          </View>
        );
      })}
    </GlassCard>
  );
}

function Stats({ count, last, seconds }: { count: number; last: number | null; seconds: number }) {
  const mins = Math.round(seconds / 60);
  const time = mins < 60 ? `${ar(mins)} دقيقة` : `${ar(Math.floor(mins / 60))} ساعة و${ar(mins % 60)} دقيقة`;
  return (
    <GlassCard style={{ paddingVertical: 8 }}>
      <Display size={17} style={{ paddingTop: 8 }}>
        إحصائيات
      </Display>
      <Row label="عدد الختمات" value={count ? ar(count) : '—'} />
      <Row label="آخر ختمة كاملة" value={last ? day(last) : '—'} />
      <Row label="الوقت في المصحف" value={time} />
    </GlassCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.between, styles.stat]}>
      <Body size={14}>{label}</Body>
      <Body size={14} weight="bold" color={colors.primary}>
        {value}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sep: { height: 1, backgroundColor: colors.hairline },
  count: { minWidth: 34, height: 26, paddingHorizontal: 8, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  ends: { gap: 8, paddingVertical: 4 },
  wird: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.hairline, gap: 8 },
  stat: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.hairline },
});
