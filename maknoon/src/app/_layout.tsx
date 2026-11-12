import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#E2E2E2' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="mushaf" options={{ animation: 'fade' }} />
        <Stack.Screen name="ayah/[id]" />
        <Stack.Screen name="hadith/[id]" />
      </Stack>
    </SafeAreaProvider>
  );
}
