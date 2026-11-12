import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { useTheme } from './theme';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  variant?: 'primary' | 'outline' | 'quiet';
  size?: 'md' | 'lg';
  /** Stretch to the container width */
  block?: boolean;
  style?: ViewStyle;
};

export function Button({ title, variant = 'primary', size = 'md', block, disabled, style, ...rest }: Props) {
  const { colors, radius } = useTheme();
  const base: ViewStyle = {
    minHeight: size === 'lg' ? 56 : 48,
    paddingHorizontal: size === 'lg' ? 32 : 24,
    borderRadius: radius.pill,
    alignSelf: block ? 'stretch' : 'flex-start',
  };
  const skin: Record<NonNullable<Props['variant']>, ViewStyle> = {
    primary: { backgroundColor: colors.ink },
    outline: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.ink },
    quiet: { backgroundColor: colors.surface },
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        base,
        skin[variant],
        { opacity: disabled ? 0.4 : pressed ? 0.82 : 1 },
        style,
      ]}
    >
      <View>
        <Text variant="label" tone={variant === 'primary' ? 'onInk' : 'ink'} style={styles.label}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, letterSpacing: 2.4 },
});
