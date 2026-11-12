import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Display } from './Typography';
import { RoundButton } from './ui';

/** Back (start) · title · bookmark + share (end), 40pt glass buttons. */
export function DetailHeader({ title }: { title: string }) {
  return (
    <View style={styles.row}>
      <RoundButton icon="chevronRight" label="رجوع" size={40} iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <Display size={22} style={styles.title} numberOfLines={1}>
        {title}
      </Display>
      <View style={[styles.row, { gap: 8 }]}>
        <RoundButton icon="share" label="مشاركة" size={40} iconSize={18} />
        <RoundButton icon="bookmark" label="حفظ" size={40} iconSize={18} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, textAlign: 'center', marginHorizontal: 8 },
});
