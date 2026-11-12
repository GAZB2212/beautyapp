import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chevron } from './icons';
import { Text } from './Text';
import { useTheme } from './theme';

/** A tappable list row: optional leading element, title, supporting text, trailing text. */
export function OptionRow({
  title,
  subtitle,
  meta,
  trailing,
  leading,
  onPress,
  first,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string | null;
  /** Small element under the text, e.g. a duration chip */
  meta?: ReactNode;
  trailing?: string;
  leading?: ReactNode;
  onPress: () => void;
  /** First row in a group: no top rule */
  first?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderTopColor: colors.line, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth * 2, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {leading ? <View style={{ marginRight: 16 }}>{leading}</View> : null}
      <View style={{ flex: 1, gap: 5 }}>
        <Text variant="subheading" style={{ fontSize: 17 }}>
          {title}
        </Text>
        {subtitle ? <Text variant="small">{subtitle}</Text> : null}
        {meta}
      </View>
      {trailing ? (
        <Text variant="subheading" style={{ fontSize: 17, marginLeft: 16 }}>
          {trailing}
        </Text>
      ) : null}
      <View style={{ marginLeft: 14, alignSelf: 'center' }}>
        <Chevron size={8} color={colors.muted} />
      </View>
    </Pressable>
  );
}

/** Label and value on one line, for summaries. */
export function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summary}>
      <Text variant="small">{label}</Text>
      <Text variant={strong ? 'subheading' : 'body'} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

/** Quiet inline notice. */
export function Banner({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' }) {
  const { colors, radius } = useTheme();
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={{
        backgroundColor: tone === 'error' ? '#F9E9E7' : colors.accentSoft,
        borderRadius: radius.sm,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <Text variant="small" style={{ color: tone === 'error' ? '#7A2A24' : colors.ink }}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 18 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, paddingVertical: 6 },
});
