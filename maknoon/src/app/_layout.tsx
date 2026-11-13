import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { I18nManager, Platform, StyleSheet } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { hydratePrefs, usePrefs } from '@/store/prefs';
import { syncPrayerAlerts } from '@/worship/prayerAlerts';
import { fontAssets } from '@/theme/fonts';

// Arabic-first: the whole app is right-to-left.
// Native builds force RTL through the expo-localization plugin (app.json); this
// covers Expo Go / first launch, and the web root gets dir="rtl".
if (Platform.OS !== 'web' && !I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'ar';
}

SplashScreen.preventAutoHideAsync().catch(() => {});
const LAUNCH = Date.now();
const SPLASH_MS = 5000; // the founder's choice: the splash stays about 5 seconds
// The system splash (iOS can only centre a logo on a colour) shows the design's logo at the same
// size and place on the design's teal; it then fades into the full design splash drawn by the app.
SplashScreen.setOptions({ fade: true, duration: 350 });

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);
  const [prefsReady, setPrefsReady] = useState(false);
  useEffect(() => {
    hydratePrefs().finally(() => setPrefsReady(true));
  }, []);

  // The design's splash, drawn full screen: the system shows it at launch, then the same picture
  // stays above the app (which loads underneath it) until 8 s have passed, and fades away.
  const [splash, setSplash] = useState(true);
  // Prayer alerts are rebuilt on the device whenever the app opens or a prayer setting changes.
  const [prefs] = usePrefs();
  const alertKey = JSON.stringify([prefs.prayerAlerts, prefs.city, prefs.asr, prefs.prayerMethod]);
  useEffect(() => {
    if (prefsReady) void syncPrayerAlerts();
  }, [prefsReady, alertKey]);
  const ready = (loaded || !!error) && prefsReady;
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setSplash(false), Math.max(0, SPLASH_MS - (Date.now() - LAUNCH)));
    // the system splash hands over once the picture is drawn above the app; never later than this
    const h = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 1200);
    return () => {
      clearTimeout(t);
      clearTimeout(h);
    };
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#E2E2E2' } }}>
        <Stack.Screen name="(tabs)" />
        {/* the page turns with a horizontal swipe, so the edge back-swipe stays off here */}
        <Stack.Screen name="mushaf" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="ayah/[id]" />
        {/* the platform's own bottom sheet: native slide, grabber, drag down to close */}
        <Stack.Screen
          name="ayah-actions"
          options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true, sheetCornerRadius: 28, contentStyle: { backgroundColor: '#F7F4F1' } }}
        />
        <Stack.Screen
          name="surah-picker"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.72, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: '#F7F4F1' },
          }}
        />
        <Stack.Screen name="hadith/[id]" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      </Stack>
    </SafeAreaProvider>
      {splash ? (
        <Animated.View exiting={FadeOut.duration(450)} style={StyleSheet.absoluteFill} pointerEvents="auto">
          <Image
            source={require('../../assets/brand/splash-full.png')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            onDisplay={() => SplashScreen.hideAsync().catch(() => {})}
          />
        </Animated.View>
      ) : null}
    </GestureHandlerRootView>
  );
}
