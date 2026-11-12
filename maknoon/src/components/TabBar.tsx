import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { Squircle } from './Squircle';
import { Body } from './Typography';

export const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'الرئيسية', icon: 'home' },
  quran: { label: 'القرآن', icon: 'quran' },
  library: { label: 'المكتبة', icon: 'books' },
  search: { label: 'البحث', icon: 'search' },
  me: { label: 'أنا', icon: 'user' },
};

/**
 * Floating blurred tab bar: 64pt pill, 24pt from the edges, white 50% + blur.
 * The active tab grows into a teal pill with its label; the rest are icons.
 * In RTL the first tab (Home) sits on the right.
 */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom - 10, 0) + 24 }]}>
      <View style={styles.bar}>
        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.tint} />
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const meta = TABS[route.name];
            if (!meta) return null;
            const focused = state.index === index;
            const onPress = () => {
              if (!focused) navigateToTab(route.key);
            };
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={meta.label}
                onPress={onPress}
                style={styles.item}
              >
                {focused ? (
                  <Squircle radius={24} fill={colors.primary} glow="button" style={styles.active}>
                    <Icon name={meta.icon} size={24} color={colors.goldWarm} />
                    <Body size={14} weight="bold" color={colors.white} lineHeight={20}>
                      {meta.label}
                    </Body>
                  </Squircle>
                ) : (
                  <View style={styles.icon}>
                    <Icon name={meta.icon} size={24} color={colors.primary} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', start: 24, end: 25 },
  bar: {
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    boxShadow: 'inset 0 4px 4px rgba(255,255,255,0.25), 0 8px 24px rgba(39,40,51,0.08)',
  },
  tint: { position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: colors.tabBar },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingStart: 8, paddingEnd: 20 },
  item: { minWidth: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  active: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13 },
});
