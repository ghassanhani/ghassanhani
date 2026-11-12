import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
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
