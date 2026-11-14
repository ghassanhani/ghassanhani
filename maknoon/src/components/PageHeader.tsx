import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Display } from './Typography';
import { RoundButton } from './ui';

/** Back (start) · centred title · optional action (end) — the row-2 artboard header. */
/** `onBack`: the screen steps back inside itself (e.g. from a chapter to its book) before leaving. */
export function PageHeader({ title, action, fallback = '/', onBack }: { title: string; action?: ReactNode; fallback?: string; onBack?: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        <RoundButton icon="arrowRight" label="رجوع" size={40} iconSize={22} onPress={() => (onBack ? onBack() : router.canGoBack() ? router.back() : router.replace(fallback as never))} />
      </View>
      <Display size={22} style={styles.title} numberOfLines={1}>
        {title}
      </Display>
      <View style={[styles.side, { alignItems: 'flex-end' }]}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 46 },
  side: { width: 96 },
  title: { flex: 1, textAlign: 'center' },
});
