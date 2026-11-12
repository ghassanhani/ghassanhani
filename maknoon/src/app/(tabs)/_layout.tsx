import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { usePrefs } from '@/store/prefs';
import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  const [prefs] = usePrefs();
  if (!prefs.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="quran" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
