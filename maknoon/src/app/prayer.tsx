import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { Screen } from '@/components/Screen';
import { Body, Caption, Display } from '@/components/Typography';
import { GlassCard, HeroCard, InnerCard, ProgressBar, RoundButton, Segmented, SoftButton } from '@/components/ui';
import { type AsrRule, CITIES, METHODS, type MethodKey, cityByKey, fmtDates, fmtDuration, fmtTime, methodAngles, usePrayerDay } from '@/content/prayer';
import { ar } from '@/content/quran';
import { prayerScreen as P } from '@/content/worship';
import { usePrefs } from '@/store/prefs';
import { F } from '@/theme/fonts';
import { Breathe, haptic } from '@/components/motion';
import { colors } from '@/theme/tokens';

export default function PrayerScreen() {
  const [prefs, setPrefs] = usePrefs();
  const asr = prefs.asr;
  const setAsr = (v: AsrRule) => setPrefs({ asr: v });
  const alerts = prefs.prayerAlerts;
  const setAlerts = (f: (a: Record<string, boolean>) => Record<string, boolean>) => setPrefs((p) => ({ prayerAlerts: f(p.prayerAlerts) }));
  const city = cityByKey(prefs.city);
  const method = (METHODS.find((m) => m.key === prefs.prayerMethod)?.key ?? city.method) as MethodKey;
  const [picking, setPicking] = useState<'city' | 'method' | null>(null);
  const { now, times, next, prev, qibla } = usePrayerDay(city, asr, method);
  const tz = city.tz;
  const ang = methodAngles(method);
  const methodName = METHODS.find((m) => m.key === method)!.name;
  const angles = `الفجر ${ar(ang.fajr)}° · العشاء ${ang.ishaInterval ? `${ar(ang.ishaInterval)} دقيقة بعد المغرب` : `${ar(ang.isha)}°`}`;
  const span = prev ? next.date.getTime() - prev.date.getTime() : 1;
  const elapsed = prev ? (now.getTime() - prev.date.getTime()) / span : 0;

  return (
    <Screen backdrop="lavender" withTabBar={false} header={<PageHeader title={P.title} action={<RoundButton icon="compass" label="المدينة" size={40} iconSize={20} onPress={() => setPicking((v) => (v === 'city' ? null : 'city'))} />} />}>
      <HeroCard hero="night" style={{ gap: 6 }}>
        <View style={styles.between}>
          <View>
            <Body size={14} weight="medium" color={colors.gold}>{`الصلاة القادمة · ${city.name}`}</Body>
            <Display size={40} color={colors.white} lineHeight={58}>
              {next.name}
            </Display>
            <Body size={13} color={colors.white}>
              {fmtDuration(next.date.getTime() - now.getTime())}
            </Body>
          </View>
          <Display size={40} color={colors.white} lineHeight={58} style={{ marginTop: 18 }}>
            {fmtTime(next.date, tz)}
          </Display>
        </View>
        {prev ? (
          <View style={{ gap: 6, marginTop: 10 }}>
            <View style={styles.between}>
              <Caption color="rgba(255,255,255,0.8)">{`${prev.name} ${fmtTime(prev.date, tz)}`}</Caption>
              <Caption color="rgba(255,255,255,0.8)">{`${next.name} ${fmtTime(next.date, tz)}`}</Caption>
            </View>
            <ProgressBar value={elapsed} height={8} fill="#B9BCF2" track="#FFFFFF" trackOpacity={0.18} />
          </View>
        ) : null}
        <Caption color="rgba(255,255,255,0.7)" style={{ marginTop: 6 }}>
          {fmtDates(now, tz)}
        </Caption>
      </HeroCard>

      <GlassCard style={{ gap: 8 }}>
        <Display size={22}>{P.today}</Display>
        {times.map((t) => {
          const isNext = t.key === next.key && t.date.getTime() === next.date.getTime();
          const done = t.date.getTime() <= now.getTime();
          const on = alerts[t.key];
          const note = isNext ? `القادمة · ${fmtDuration(t.date.getTime() - now.getTime())}` : t.key === 'sunrise' ? P.sunriseNote : done ? 'تمّت' : '';
          return (
            <InnerCard key={t.key} fill={isNext ? '#0C1140' : undefined} style={[styles.row, { gap: 12, minHeight: 60, paddingVertical: 8 }]}>
              {isNext ? (
                <Breathe scale={1.25}>
                  <View style={[styles.dot, styles.dotNext]} />
                </Breathe>
              ) : (
                <View style={[styles.dot, done && { backgroundColor: colors.sky, borderWidth: 0 }]} />
              )}
              <View style={{ flex: 1 }}>
                <Display size={18} color={isNext ? colors.white : colors.ink}>
                  {t.name}
                </Display>
                {note ? <Caption color={isNext ? colors.gold : colors.muted}>{note}</Caption> : null}
              </View>
              <Display size={20} color={isNext ? colors.white : colors.ink}>
                {fmtTime(t.date, tz)}
              </Display>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${on ? 'إيقاف' : 'تشغيل'} تنبيه ${t.name}`}
                onPress={() => {
                  haptic.select();
                  setAlerts((a) => ({ ...a, [t.key]: !a[t.key] }));
                }}
                style={[styles.bell, on && { backgroundColor: isNext ? 'rgba(255,255,255,0.14)' : 'rgba(3,90,95,0.08)' }]}
              >
                <Icon name="bell" size={18} color={isNext ? (on ? colors.white : '#8C8FB8') : on ? colors.primary : '#A3A4AF'} />
              </Pressable>
            </InnerCard>
          );
        })}
      </GlassCard>

      <GlassCard tint="lavender" style={{ gap: 14 }}>
        <View style={[styles.row, { gap: 16 }]}>
          <Compass bearing={qibla} />
          <View style={{ flex: 1 }}>
            <Caption>{P.qibla.title}</Caption>
            <Display size={34} lineHeight={46}>{`${ar(Math.round(qibla))}°`}</Display>
            <Body size={13} color={colors.primary}>
              {P.qibla.from}
            </Body>
          </View>
        </View>
        <Body size={13} color="#4A4B57">
          {P.qibla.hint}
        </Body>
        <SoftButton label={P.qibla.map} />
      </GlassCard>

      <GlassCard style={{ gap: 12 }}>
        <Display size={22}>{P.method.title}</Display>
        <Pressable accessibilityRole="button" accessibilityLabel="تغيير المدينة" onPress={() => setPicking((v) => (v === 'city' ? null : 'city'))}>
          <Display size={16}>المدينة</Display>
          <Body size={13} color={colors.primary}>{`${city.name} · اضغط للتغيير`}</Body>
        </Pressable>
        {picking === 'city' ? (
          <Options
            items={CITIES.map((c) => ({ key: c.key, label: c.name }))}
            value={city.key}
            onPick={(k) => {
              setPrefs({ city: k, prayerMethod: null }); // a new city starts from its own suggested authority
              setPicking(null);
            }}
          />
        ) : null}
        <View style={styles.hairline} />
        <Pressable accessibilityRole="button" accessibilityLabel="تغيير طريقة الحساب" onPress={() => setPicking((v) => (v === 'method' ? null : 'method'))}>
          <Display size={16}>{P.method.authority}</Display>
          <Body size={13} color={colors.primary}>{`${methodName} · ${angles}`}</Body>
        </Pressable>
        {picking === 'method' ? (
          <Options
            items={METHODS.map((m) => ({ key: m.key, label: m.name }))}
            value={method}
            onPick={(k) => {
              setPrefs({ prayerMethod: k });
              setPicking(null);
            }}
          />
        ) : null}
        <Caption>تختلف طرق الحساب بين البلدان. اختر المعتمدة في بلدك، واتّبع مسجدك عند الاختلاف.</Caption>
        <View style={styles.hairline} />
        <Display size={16}>{P.method.asr}</Display>
        <Segmented
          options={[
            { value: 'j' as AsrRule, label: P.method.asrJ },
            { value: 'h' as AsrRule, label: P.method.asrH },
          ]}
          value={asr}
          onChange={setAsr}
        />
      </GlassCard>

      <View style={[styles.row, { gap: 8, paddingHorizontal: 6 }]}>
        <Icon name="badge" size={18} color={colors.primary} />
        <Caption style={{ flex: 1 }}>{P.privacy}</Caption>
      </View>
    </Screen>
  );
}

/** A wrap of selectable pills (city / calculation authority). */
function Options({ items, value, onPick }: { items: { key: string; label: string }[]; value: string; onPick: (key: string) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={styles.options}>
      {items.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onPick(o.key)} style={[styles.option, on && { backgroundColor: colors.primary }]}>
            <Body size={13} weight="medium" color={on ? colors.white : colors.ink}>
              {o.label}
            </Body>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Static compass rose with the qibla bearing (device heading needs a sensor; next step). */
function Compass({ bearing }: { bearing: number }) {
  const s = 120;
  const c = s / 2;
  return (
    <Svg width={s} height={s} accessibilityLabel={`اتجاه القبلة ${Math.round(bearing)} درجة من الشمال`}>
      <Circle cx={c} cy={c} r={c - 2} fill="#FFFFFF" fillOpacity={0.85} />
      {Array.from({ length: 36 }, (_, i) => (
        <Line key={i} x1={c} y1={6} x2={c} y2={i % 9 === 0 ? 16 : 11} stroke="#A3A4AF" strokeWidth={i % 9 === 0 ? 2 : 1} transform={`rotate(${i * 10} ${c} ${c})`} />
      ))}
      <SvgText x={c} y={28} fontSize={12} fill={colors.ink} textAnchor="middle" fontFamily={F.sansBold}>
        ش
      </SvgText>
      <G transform={`rotate(${bearing} ${c} ${c})`}>
        <Line x1={c} y1={c} x2={c} y2={18} stroke={colors.primary} strokeWidth={6} strokeLinecap="round" />
        <Circle cx={c} cy={18} r={7} fill="#D9BC85" />
      </G>
      <Circle cx={c} cy={c} r={5} fill="#FFFFFF" stroke={colors.primary} strokeWidth={2} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#C9CAD3' },
  dotNext: { backgroundColor: '#D9BC85', borderWidth: 0, boxShadow: '0 0 0 4px rgba(217,188,133,0.3)' },
  bell: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hairline: { height: 1, backgroundColor: colors.hairline },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: 'rgba(3,90,95,0.08)', alignItems: 'center', justifyContent: 'center' },
});
