import { View } from 'react-native';
import { useTheme } from './theme';

/** Tiny vector-free icons drawn with borders, so they stay crisp and add no font download. */
export function Chevron({
  direction = 'right',
  size = 10,
  color,
}: {
  direction?: 'left' | 'right' | 'down' | 'up';
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  const rotate = { right: '45deg', down: '135deg', left: '225deg', up: '315deg' }[direction];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderTopWidth: 1.5,
        borderRightWidth: 1.5,
        borderColor: color ?? colors.ink,
        transform: [{ rotate }],
      }}
    />
  );
}

export function Check({ size = 14, color }: { size?: number; color?: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size * 0.55,
        height: size,
        borderBottomWidth: 1.75,
        borderRightWidth: 1.75,
        borderColor: color ?? colors.ink,
        transform: [{ rotate: '45deg' }, { translateY: -size * 0.12 }],
      }}
    />
  );
}
