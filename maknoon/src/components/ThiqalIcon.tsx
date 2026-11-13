import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { THIQAL } from './thiqalIcons';

export type ThiqalName = 'back' | 'fwd' | 'plus' | 'minus' | 'search' | 'play' | 'pause' | 'close' | 'check' | 'more';

/** An icon from the Thiqal library (the set the Gymco app uses): rounded outline, 1.5 stroke. */
export function ThiqalIcon({ name, size = 24, color = colors.ink, strokeWidth = 1.5 }: { name: ThiqalName; size?: number; color?: string; strokeWidth?: number }) {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="${strokeWidth}">${THIQAL[name]}</svg>`;
  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
      <SvgXml xml={xml} width={size} height={size} color={color} />
    </View>
  );
}
