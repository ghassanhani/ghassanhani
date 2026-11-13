import type { ComponentProps } from 'react';
import { Pressable as RNPressable } from 'react-native';

/**
 * The app's Pressable: identical to React Native's, but it answers the finger at once (it dims while
 * held), so a tap never feels ignored while the next screen is being prepared. A style given as a
 * function keeps full control of the pressed look.
 */
export function Pressable({ style, disabled, ...rest }: ComponentProps<typeof RNPressable>) {
  return (
    <RNPressable
      disabled={disabled}
      unstable_pressDelay={0}
      style={typeof style === 'function' ? style : ({ pressed }) => [style, pressed && !disabled && PRESSED]}
      {...rest}
    />
  );
}

const PRESSED = { opacity: 0.55 };
