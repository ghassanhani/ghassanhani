import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { Pressable } from "@/components/Tap";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Screen } from "@/components/Screen";
import { Squircle } from "@/components/Squircle";
import { atStart, PressScale } from "@/components/motion";
import { Body, Caption, Display } from "@/components/Typography";
import { GlassCard, HeroCard } from "@/components/ui";
import { ar, ayatLabel } from "@/content/quran";
import { quranIndex } from "@/content/worship";
import {
  pauseResume,
  playSurah,
  recitationById,
  recitationCredit,
  recitations,
  seek,
  setRate,
  skipSurah,
  useProgress,
  usePlayer,
} from "@/recitation/player";
import { usePrefs } from "@/store/prefs";
import { readingAt } from "@/store/reading";
import { F } from "@/theme/fonts";
import { colors } from "@/theme/tokens";

const norm = (s: string) =>
  s
    .replace(/[ً-ٰٟۖ-ۭـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return ar(h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`);
};
const RATES = [0.75, 1, 1.25, 1.5];

/**
 * The listening hub: whole surahs with the chosen reciter (every recitation has them), one after
 * another; now playing with its place in the surah, previous / next surah and speed; the reciter
 * changed here directly. Audio streams from RATQ and keeps playing with the screen locked.
 */
export default function ListenScreen() {
  const [prefs, setPrefs] = usePrefs();
  const audio = usePlayer();
  const reciter = recitationById(prefs.reciter);
  const [q, setQ] = useState("");
  const [picking, setPicking] = useState(false);
  const surahs = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return quranIndex.surahs;
    return quranIndex.surahs.filter(
      (s) => String(s.n) === n || norm(s.name).includes(n),
    );
  }, [q]);

  // the surah in the hub: the one playing, else where the reader stopped
  const playingSurah = audio.playing?.startsWith("surah:")
    ? Number(audio.playing.slice(6))
    : null;
  const shown = playingSurah ?? readingAt(prefs.lastPage).surah;
  const meta = quranIndex.surahs[shown - 1];
  const live = playingSurah !== null;
  const main = () =>
    live ? pauseResume() : playSurah(shown).catch(() => undefined);

  return (
    <Screen
      backdrop="mint"
      withTabBar={false}
      header={<PageHeader title="الاستماع" fallback="/quran" />}
    >
      <HeroCard hero="teal" style={{ gap: 14, paddingVertical: 22 }}>
        <View style={{ alignItems: "center", gap: 2 }}>
          <Body size={13} weight="medium" color={colors.gold}>
            {live
              ? audio.paused
                ? "متوقّف مؤقتًا"
                : "يُتلى الآن"
              : "ابدأ الاستماع"}
          </Body>
          <Display
            size={30}
            color={colors.white}
            style={{ textAlign: "center" }}
          >
            {`سُورَةُ ${meta.name}`}
          </Display>
          <Caption
            color="rgba(255,255,255,0.8)"
            style={{ textAlign: "center" }}
          >{`${reciter.name.replace(/^مصحف القارئ /, "")} · ${meta.type} · ${ayatLabel(meta.ayat)}`}</Caption>
        </View>
        {live ? <Progress /> : null}
        <View style={[styles.row, { justifyContent: "center", gap: 22 }]}>
          <RoundCtl
            icon="chevronRight"
            label="السورة السابقة"
            disabled={!live || shown <= 1}
            onPress={() => skipSurah(-1)}
          />
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={live && !audio.paused ? "إيقاف مؤقت" : "استمع"}
            onPress={main}
            feedback="tap"
            scaleTo={0.92}
          >
            <Squircle radius={36} fill={colors.white} style={styles.big}>
              {audio.loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Icon
                  name={live && !audio.paused ? "pause" : "play"}
                  size={28}
                  color={colors.primary}
                />
              )}
            </Squircle>
          </PressScale>
          <RoundCtl
            icon="chevronLeft"
            label="السورة التالية"
            disabled={!live || shown >= 114}
            onPress={() => skipSurah(1)}
          />
        </View>
        <View style={[styles.row, { justifyContent: "center", gap: 8 }]}>
          {RATES.map((r) => {
            const on = audio.rate === r;
            return (
              <Pressable
                key={r}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`السرعة ${r}`}
                onPress={() => setRate(r)}
              >
                <Squircle
                  radius={14}
                  fill={on ? colors.white : "rgba(255,255,255,0.14)"}
                  style={styles.rate}
                >
                  <Body
                    size={12}
                    weight="bold"
                    lineHeight={16}
                    color={on ? colors.primary : colors.white}
                  >
                    {`${ar(String(r))}×`}
                  </Body>
                </Squircle>
              </Pressable>
            );
          })}
        </View>
      </HeroCard>

      <GlassCard style={{ paddingVertical: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تغيير القارئ"
          onPress={() => setPicking((v) => !v)}
          style={[styles.row, styles.item]}
        >
          <Icon name="mic" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Caption>القارئ</Caption>
            <Display size={16}>{reciter.name}</Display>
          </View>
          <Icon name="chevronDown" size={18} color={colors.primary} />
        </Pressable>
        {picking
          ? recitations.map((x) => (
              <Pressable
                key={x.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: x.id === reciter.id }}
                onPress={() => {
                  setPrefs({ reciter: x.id });
                  setPicking(false);
                }}
                style={[styles.row, styles.item, styles.sep]}
              >
                <Body
                  size={14}
                  weight={x.id === reciter.id ? "bold" : "regular"}
                  color={x.id === reciter.id ? colors.primary : colors.ink}
                  style={{ flex: 1 }}
                >
                  {x.name}
                </Body>
                {x.id === reciter.id ? (
                  <Icon name="badge" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            ))
          : null}
      </GlassCard>

      <Squircle
        radius={28}
        fill="rgba(255,255,255,0.6)"
        glow="glass"
        style={styles.field}
      >
        <Icon name="search" size={20} color="#35625B" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="ابحث باسم السورة أو رقمها"
          placeholderTextColor={colors.muted}
          accessibilityLabel="ابحث عن سورة"
          style={[styles.input, { fontFamily: F.sans }]}
        />
      </Squircle>
      <GlassCard style={{ paddingVertical: 8 }}>
        {surahs.map((s, i) => {
          const now = playingSurah === s.n;
          return (
            <Pressable
              key={s.n}
              accessibilityRole="button"
              accessibilityLabel={`استمع إلى سورة ${s.name}`}
              onPress={() =>
                now ? pauseResume() : playSurah(s.n).catch(() => undefined)
              }
              style={[styles.row, styles.item, i > 0 && styles.sep]}
            >
              <Squircle
                radius={12}
                fill={now ? colors.primary : "rgba(3,90,95,0.08)"}
                style={styles.num}
              >
                {now ? (
                  <Icon
                    name={audio.paused ? "play" : "pause"}
                    size={16}
                    color={colors.white}
                  />
                ) : (
                  <Display size={14} color={colors.primary}>
                    {ar(s.n)}
                  </Display>
                )}
              </Squircle>
              <View style={{ flex: 1 }}>
                <Display size={17} color={now ? colors.primary : colors.ink}>
                  {s.name}
                </Display>
                <Body
                  size={12}
                  color={colors.primary}
                >{`${s.type} · ${ayatLabel(s.ayat)}`}</Body>
              </View>
              <Icon
                name="play"
                size={18}
                color={now ? colors.primary : colors.muted}
              />
            </Pressable>
          );
        })}
        {!surahs.length ? (
          <Caption style={{ paddingVertical: 12 }}>لا نتائج</Caption>
        ) : null}
      </GlassCard>
      <Caption style={{ textAlign: "center" }}>
        {recitationCredit(reciter)}
      </Caption>
    </Screen>
  );
}

/** The place in the surah: a bar you can tap to jump, with the elapsed and total time. */
function Progress() {
  const { time, duration } = useProgress();
  const [w, setW] = useState(0);
  const f = duration > 0 ? Math.min(1, time / duration) : 0;
  const jump = (e: GestureResponderEvent) => {
    if (!w || !duration) return;
    // RTL: the bar fills from the right
    const x = e.nativeEvent.locationX;
    seek((1 - x / w) * duration);
  };
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="موضع التلاوة"
        onPress={jump}
        onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
        style={{ paddingVertical: 8 }}
      >
        <View style={styles.track}>
          <View style={[styles.fill, atStart(0), { width: `${f * 100}%` }]} />
        </View>
      </Pressable>
      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <Caption color="rgba(255,255,255,0.85)">{clock(time)}</Caption>
        <Caption color="rgba(255,255,255,0.6)">{clock(duration)}</Caption>
      </View>
    </View>
  );
}

function RoundCtl({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: "chevronLeft" | "chevronRight";
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
    >
      <Squircle radius={24} fill="rgba(255,255,255,0.16)" style={styles.ctl}>
        <Icon name={icon} size={22} color={colors.white} />
      </Squircle>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  item: { gap: 12, paddingVertical: 12 },
  sep: { borderTopWidth: 1, borderTopColor: colors.hairline },
  num: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  big: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  ctl: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  rate: {
    height: 28,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  field: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: colors.ink,
    textAlign: "right",
    paddingVertical: 0,
  },
});
