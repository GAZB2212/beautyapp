import { Pressable, Text, type PressableProps, StyleSheet } from 'react-native';
import { useTheme } from './theme';

type Props = PressableProps & { title: string; variant?: 'primary' | 'secondary' };

export function Button({ title, variant = 'primary', style, ...rest }: Props) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.primary : t.surface;
  const fg = variant === 'primary' ? t.background : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={(state) => [
        styles.base,
        { backgroundColor: bg, borderRadius: t.radius, opacity: state.pressed ? 0.85 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <Text style={[styles.label, { color: fg, fontFamily: t.fontFamily }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '600' },
});
