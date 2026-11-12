import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Check } from './icons';
import { Text } from './Text';
import { useTheme } from './theme';

type FieldProps = TextInputProps & {
  label: string;
  /** Keep the label for screen readers but do not show it (e.g. inside a labelled row) */
  hideLabel?: boolean;
  error?: string;
  hint?: string;
  optional?: boolean;
};

/** Labelled text input with a quiet hairline border that darkens on focus. */
export function TextField({ label, hideLabel, error, hint, optional, style, onFocus, onBlur, ...rest }: FieldProps) {
  const { colors, fonts, radius } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {hideLabel ? null : (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="label" tone="muted">
            {label}
          </Text>
          {optional ? (
            <Text variant="small" style={{ fontSize: 12, lineHeight: 16 }}>
              Optional
            </Text>
          ) : null}
        </View>
      )}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            fontFamily: fonts.body,
            fontSize: 16, // 16px stops iOS Safari zooming the page on focus
            color: colors.ink,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: error ? '#B4443C' : focused ? colors.ink : colors.line,
            borderRadius: radius.sm,
            paddingHorizontal: 14,
            paddingVertical: 13,
            minHeight: rest.multiline ? 96 : 50,
            textAlignVertical: rest.multiline ? 'top' : 'center',
          },
          // remove the browser's default focus ring; the border shows focus instead
          { outlineStyle: 'none' } as object,
          style,
        ]}
      />
      {error ? (
        <Text variant="small" style={{ color: '#B4443C' }} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small">{hint}</Text>
      ) : null}
    </View>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.checkRow}
      hitSlop={6}
    >
      <View
        style={[
          styles.box,
          { borderColor: checked ? colors.ink : colors.line, backgroundColor: checked ? colors.ink : colors.background },
        ]}
      >
        {checked ? <Check size={11} color={colors.onInk} /> : null}
      </View>
      <Text variant="small" tone="ink" style={{ flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
