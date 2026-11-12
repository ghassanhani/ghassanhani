import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '@/theme/tokens';
import { Backdrop, type BackdropName } from './Backdrop';

export const TAB_BAR_SPACE = 24 + 64 + 24; // bottom inset + bar + breathing room

/** Fixed backdrop + scrolling content column with the 24pt gutter. */
export function Screen({
  backdrop,
  children,
  header,
  withTabBar = true,
  contentStyle,
}: {
  backdrop: BackdropName;
  children: ReactNode;
  /** rendered above the scroll view (non-scrolling) */
  header?: ReactNode;
  withTabBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Backdrop name={backdrop} />
      {header ? <View style={{ paddingTop: insets.top + 12, paddingHorizontal: space.gutter }}>{header}</View> : null}
      <ScrollView
        style={styles.root}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          {
            paddingTop: header ? 16 : insets.top + 12,
            paddingHorizontal: space.gutter,
            paddingBottom: (withTabBar ? TAB_BAR_SPACE : 32) + insets.bottom,
            gap: space.gap,
          },
          contentStyle,
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
