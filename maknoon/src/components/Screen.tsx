import type { ComponentRef, ReactNode, Ref } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
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
  footer,
  scrollRef,
  onContentSizeChange,
}: {
  backdrop: BackdropName;
  children: ReactNode;
  /** rendered above the scroll view (non-scrolling) */
  header?: ReactNode;
  withTabBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** rendered below the scroll view and kept above the keyboard (e.g. a chat input) */
  footer?: ReactNode;
  scrollRef?: Ref<ComponentRef<typeof ScrollView>>;
  onContentSizeChange?: (w: number, h: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const body = (
    <View style={styles.root}>
      <Backdrop name={backdrop} />
      {header ? (
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: space.gutter,
          }}
        >
          {header}
        </View>
      ) : null}
      <ScrollView
        ref={scrollRef}
        onContentSizeChange={onContentSizeChange}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        style={styles.root}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          {
            paddingTop: header ? 16 : insets.top + 12,
            paddingHorizontal: space.gutter,
            paddingBottom: footer ? 16 : (withTabBar ? TAB_BAR_SPACE : 32) + insets.bottom,
            gap: space.gap,
          },
          contentStyle,
        ]}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={{
            paddingHorizontal: space.gutter,
            paddingTop: 8,
            paddingBottom: insets.bottom + 8,
          }}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
  if (!footer) return body;
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {body}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
