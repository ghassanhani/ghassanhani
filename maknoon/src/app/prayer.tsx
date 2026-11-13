import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';
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
import { colors, space } from '@/theme/tokens';

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

      <GlassCard style={{ gap: 12, alignItems: 'center' }}>
        <QiblaCompass bearing={qibla} />
        <Body size={13} color="#4A4B57" style={{ textAlign: 'center' }}>
          {P.qibla.hint}
        </Body>
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
/**
 * The qibla compass: the dial turns with the phone (its «ش» points to true north, from the phone's
 * own calibrated compass); the needle points to the qibla with the Kaaba at its tip. The fixed mark
 * at the top is where the phone points: bring the Kaaba under it and the phone taps once.
 * The heading is read on the device only (iOS asks for location permission to give it).
 */
function QiblaCompass({ bearing }: { bearing: number }) {
  const { width } = useWindowDimensions();
  const size = Math.min(300, width - 2 * space.gutter - 56);
  const c = size / 2;
  const [mode, setMode] = useState<'off' | 'on' | 'denied' | 'none'>(Platform.OS === 'web' ? 'none' : 'off');
  const [facing, setFacing] = useState(false);
  const turn = useSharedValue(0); // the phone's heading, unwrapped (no jump between 359° and 0°)
  const last = useRef(0);
  const sub = useRef<{ remove: () => void } | null>(null);

  const start = useCallback(async (ask: boolean) => {
    try {
      const perm = ask ? await Location.requestForegroundPermissionsAsync() : await Location.getForegroundPermissionsAsync();
      if (!perm.granted) {
        if (ask) setMode('denied');
        return;
      }
      sub.current?.remove();
      sub.current = await Location.watchHeadingAsync((h) => {
        const v = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        const d = ((v - (last.current % 360) + 540) % 360) - 180;
        last.current += d;
        turn.set(withTiming(last.current, { duration: 200, easing: Easing.out(Easing.quad) }));
        setFacing(Math.abs(((bearing - v + 540) % 360) - 180) < 4);
      });
      setMode('on');
    } catch {
      setMode('none');
    }
  }, [bearing, turn]);
  useEffect(() => {
    // already allowed: start at once, without asking (on the next tick, outside the render pass)
    const t = Platform.OS !== 'web' ? setTimeout(() => void start(false), 0) : undefined;
    return () => {
      if (t) clearTimeout(t);
      sub.current?.remove();
    };
  }, [start]);
  useEffect(() => {
    if (facing) haptic.land();
  }, [facing]);

  const dial = useAnimatedStyle(() => ({ transform: [{ rotate: `${-turn.get()}deg` }] }));
  // the dial turns by −heading; turning the Kaaba back by +heading keeps it upright on screen
  const upright = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get()}deg` }] }));
  const r = c - 6; // the Kaaba sits on the dial's edge, over the ring of ticks

  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <View style={{ width: size, height: size + 14, alignItems: 'center' }}>
        {/* where the phone points */}
        <View style={[styles.lubber, { borderTopColor: facing ? '#2E8B57' : colors.ink }]} />
        <Animated.View style={[{ width: size, height: size, marginTop: 4 }, dial]} accessibilityLabel={`اتجاه القبلة ${Math.round(bearing)} درجة من الشمال`}>
          <Svg width={size} height={size}>
            <Circle cx={c} cy={c} r={c - 2} fill="#FFFFFF" fillOpacity={0.92} stroke={facing ? '#2E8B57' : 'rgba(3,90,95,0.15)'} strokeWidth={facing ? 3 : 1} />
            {Array.from({ length: 72 }, (_, i) => (
              <Line key={i} x1={c} y1={8} x2={c} y2={i % 18 === 0 ? 22 : i % 2 === 0 ? 16 : 12} stroke={i % 18 === 0 ? colors.primary : i % 2 === 0 ? 'rgba(3,90,95,0.55)' : '#B9BAC4'} strokeWidth={i % 18 === 0 ? 3 : i % 2 === 0 ? 1.6 : 1} transform={`rotate(${i * 5} ${c} ${c})`} />
            ))}
            {[['ش', 0], ['ق', 90], ['ج', 180], ['غ', 270]].map(([t, a]) => {
              const rad = ((a as number) * Math.PI) / 180;
              return (
                <G key={t as string}>
                  <SvgText x={c + (c - 36) * Math.sin(rad)} y={c - (c - 36) * Math.cos(rad) + 6} fontSize={t === 'ش' ? 17 : 14} fill={t === 'ش' ? '#B3261E' : colors.ink} textAnchor="middle" fontFamily={F.sansBold}>
                    {t as string}
                  </SvgText>
                  <SvgText x={c + (c - 58) * Math.sin(rad)} y={c - (c - 58) * Math.cos(rad) + 4} fontSize={10} fill="#8A8B96" textAnchor="middle" fontFamily={F.sans}>
                    {ar(a as number)}
                  </SvgText>
                </G>
              );
            })}
            {/* the arrow to the qibla: amber, green once the phone faces it; a short red tail behind */}
            <G transform={`rotate(${bearing} ${c} ${c})`}>
              <Polygon points={`${c},${c - r + 24} ${c - 11},${c} ${c + 11},${c}`} fill={facing ? '#2E8B57' : '#F2A516'} />
              <Polygon points={`${c - 11},${c} ${c + 11},${c} ${c},${c + 34}`} fill={facing ? '#1E6B42' : '#E2483A'} />
            </G>
            <Circle cx={c} cy={c} r={6} fill="#FFFFFF" stroke={facing ? '#2E8B57' : colors.ink} strokeWidth={2.5} />
          </Svg>
          {/* the Kaaba at the needle's tip, kept upright */}
          <Animated.View style={[styles.kaaba, { left: c + r * Math.sin((bearing * Math.PI) / 180) - 22, top: c - r * Math.cos((bearing * Math.PI) / 180) - 22 }, upright, facing && { borderColor: '#2E8B57' }]}>
            <Image source={require('../../assets/brand/kaaba.png')} style={{ width: 30, height: 30 }} accessibilityLabel="الكعبة" />
          </Animated.View>
        </Animated.View>
      </View>
      <Display size={30} lineHeight={40}>{`${ar(Math.round(bearing))}° ${P.qibla.from}`}</Display>
      {mode === 'on' ? (
        <Body size={14} weight="bold" color={facing ? '#2E8B57' : colors.primary}>
          {facing ? 'أنت باتجاه القبلة' : 'أدِر الجهاز حتى يصير السهم أخضر'}
        </Body>
      ) : mode === 'off' || mode === 'denied' ? (
        <SoftButton label={mode === 'denied' ? 'اسمح بالبوصلة من الإعدادات' : 'شغّل البوصلة'} onPress={() => (mode === 'denied' ? Linking.openSettings() : start(true))} />
      ) : (
        <Caption>البوصلة تعمل في تطبيق الجوال.</Caption>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lubber: { width: 0, height: 0, borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  kaaba: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#F2A516', boxShadow: '0 3px 8px rgba(0,0,0,0.2)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#C9CAD3' },
  dotNext: { backgroundColor: '#D9BC85', borderWidth: 0, boxShadow: '0 0 0 4px rgba(217,188,133,0.3)' },
  bell: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hairline: { height: 1, backgroundColor: colors.hairline },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, borderCurve: 'continuous', backgroundColor: 'rgba(3,90,95,0.08)', alignItems: 'center', justifyContent: 'center' },
});
