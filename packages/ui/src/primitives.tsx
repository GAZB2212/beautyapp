import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { useTheme } from './theme';
import { widths } from './tokens';

/** Thin rule. `short` renders the small centred accent rule used under headings. */
export function Divider({ short, style }: { short?: boolean; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        short
          ? { width: 36, height: 1, backgroundColor: colors.accent }
          : { height: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.line },
        style,
      ]}
    />
  );
}

/** Centred content column. Full width on phones, capped on tablet and desktop. */
export function Container({
  children,
  wide,
  style,
  ...rest
}: PropsWithChildren<ViewProps & { wide?: boolean }>) {
  return (
    <View
      {...rest}
      style={[
        { width: '100%', maxWidth: wide ? widths.wide : widths.column, alignSelf: 'center', paddingHorizontal: 24 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Card({ children, style, ...rest }: PropsWithChildren<ViewProps>) {
  const { colors, radius } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.background,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: colors.line,
          padding: 20,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Small pill for metadata such as "45 min". */
export function Chip({ label }: { label: string }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.accentSoft,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text variant="small" tone="ink" style={{ fontSize: 12, lineHeight: 16 }}>
        {label}
      </Text>
    </View>
  );
}

/** Round monogram, used until a stylist photo or salon logo is uploaded. */
export function Monogram({ name, size = 64 }: { name: string; size?: number }) {
  const { colors, fonts } = useTheme();
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.38, lineHeight: size * 0.5, color: colors.ink }}>
        {initials}
      </Text>
    </View>
  );
}

/** Eyebrow + serif heading used to open each section of a page. */
export function SectionHeading({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 10, marginBottom: 24 }}>
      {eyebrow ? (
        <Text variant="label" tone="muted">
          {eyebrow}
        </Text>
      ) : null}
      <Text variant="heading" center accessibilityRole="header">
        {title}
      </Text>
      <Divider short />
    </View>
  );
}
