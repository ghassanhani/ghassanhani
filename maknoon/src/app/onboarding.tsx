import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Tap';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Squircle } from '@/components/Squircle';
import { Body, Caption, Display } from '@/components/Typography';
import { CountBadge, Cta, GlassCard, InnerCard } from '@/components/ui';
import { onboarding as O } from '@/content/account';
import { type Madhhab, usePrefs } from '@/store/prefs';
import { colors } from '@/theme/tokens';
import { APP_NAME } from '@/config';

type Opt = readonly [string, string, ...string[]];

export default function OnboardingScreen() {
  // Starts from saved choices (defaults = the canvas's initial states); saved on «متابعة».
  const [prefs, setPrefs] = usePrefs();
  const [lang, setLang] = useState(prefs.lang);
  const [madhhab, setMadhhab] = useState<string>(prefs.madhhab);
  const [goals, setGoals] = useState<Record<string, boolean>>(prefs.goals);
  const [loc, setLoc] = useState<string>(prefs.locMode);
  const finish = () => {
    setPrefs({ onboarded: true, lang, madhhab: madhhab as Madhhab, goals, locMode: loc as 'city' | 'gps' });
    router.replace('/');
  };

  return (
    <Screen backdrop="mist" withTabBar={false}>
      <View style={styles.head}>
        <Image source={require('../../assets/brand/app-icon.png')} style={styles.icon} accessibilityLabel={APP_NAME} />
        <Display size={32} lineHeight={42} style={{ textAlign: 'center' }}>
          {O.title}
        </Display>
        <Body size={15} color="#4A4B57" lineHeight={26} style={{ textAlign: 'center', maxWidth: 320 }}>
          {O.intro}
        </Body>
      </View>

      <Step n={O.steps.lang.n} title={O.steps.lang.title}>
        <Chips options={O.steps.lang.options} isOn={(k) => k === lang} onPick={setLang} />
      </Step>

      <Step n={O.steps.madhhab.n} title={O.steps.madhhab.title} note={O.steps.madhhab.note}>
        <Chips options={O.steps.madhhab.options} isOn={(k) => k === madhhab} onPick={setMadhhab} />
      </Step>

      <Step n={O.steps.goals.n} title={O.steps.goals.title} note={O.steps.goals.note}>
        <Chips options={O.steps.goals.options} isOn={(k) => !!goals[k]} onPick={(k) => setGoals((g) => ({ ...g, [k]: !g[k] }))} multi />
      </Step>

      <Step n={O.steps.loc.n} title={O.steps.loc.title}>
        {O.steps.loc.options.map(([k, label, sub]) => {
          const on = k === loc;
          return (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setLoc(k)}>
              <InnerCard selected={on} style={[styles.row, { gap: 12 }]}>
                <View style={[styles.radio, on && styles.radioOn]} />
                <View style={{ flex: 1 }}>
                  <Display size={16}>{label}</Display>
                  <Body size={13} color={colors.primary}>
                    {sub}
                  </Body>
                </View>
              </InnerCard>
            </Pressable>
          );
        })}
        <View style={[styles.row, { gap: 6 }]}>
          <Icon name="badge" size={16} color={colors.primary} />
          <Caption style={{ flex: 1 }}>{O.steps.loc.note}</Caption>
        </View>
      </Step>

      <Cta label={O.cta} height={56} onPress={finish} />
    </Screen>
  );
}

function Step({ n, title, note, children }: { n: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <GlassCard style={{ gap: 12 }}>
      <View style={[styles.row, { gap: 10 }]}>
        <CountBadge value={n} />
        <Display size={20}>{title}</Display>
      </View>
      {note ? (
        <Body size={13} color="#4A4B57" lineHeight={22}>
          {note}
        </Body>
      ) : null}
      {children}
    </GlassCard>
  );
}

function Chips({ options, isOn, onPick, multi }: { options: readonly Opt[]; isOn: (k: string) => boolean; onPick: (k: string) => void; multi?: boolean }) {
  return (
    <View style={[styles.row, { flexWrap: 'wrap', gap: 8 }]}>
      {options.map(([k, label]) => {
        const on = isOn(k);
        return (
          <Pressable key={k} accessibilityRole={multi ? 'checkbox' : 'radio'} accessibilityState={{ checked: on }} onPress={() => onPick(k)}>
            <Squircle radius={21} fill={on ? colors.primary : 'rgba(255,255,255,0.7)'} glow={on ? 'none' : 'glass'} stroke={on ? undefined : '#FFFFFF'} style={styles.chip}>
              <Body size={14} weight={on ? 'bold' : 'medium'} color={on ? colors.white : colors.ink} lineHeight={20}>
                {label}
              </Body>
            </Squircle>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  head: { alignItems: 'center', gap: 14, paddingTop: 22, paddingBottom: 6 },
  icon: { width: 84, height: 84, borderRadius: 24, borderCurve: 'continuous', boxShadow: '0 10px 30px rgba(3,90,95,0.25)' },
  chip: { height: 42, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.white },
  radioOn: { borderWidth: 7, borderColor: colors.sky },
});
