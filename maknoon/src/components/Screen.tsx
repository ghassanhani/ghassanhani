import { Children, type ComponentRef, Fragment, type ReactNode, type Ref, isValidElement } from 'react';
import Animated from 'react-native-reanimated';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '@/theme/tokens';
import { Backdrop, type BackdropName } from './Backdrop';
import { enterAt } from './motion';

// Reanimated's web build briefly lifts entering cards out of the layout (they overlap mid-animation),
// so the staggered entrance runs on iOS/Android only.
const WEB = Platform.OS === 'web';

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
  // Stagger only the first appearance of the screen; later additions (a new answer) appear at once.
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
        {/* Each card rises in shortly after the one before it (only when it first appears). */}
        {/* cards given in a group (<>…</>, or a part of the screen returning several) are spaced like the rest */}
        {flatten(children).map((child, i) => {
          const key = isValidElement(child) && child.key != null ? child.key : i;
          return (
            <Animated.View key={key} entering={WEB ? undefined : enterAt(i)}>
              {child}
            </Animated.View>
          );
        })}
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

/** The screen's cards, with fragments opened up (so every card gets the same gap). */
function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((c) => (isValidElement<{ children?: ReactNode }>(c) && c.type === Fragment ? flatten(c.props.children) : [c]));
}
