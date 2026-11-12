import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from './theme';

export type TextVariant =
  | 'display' // salon name, hero
  | 'title' // page titles
  | 'heading' // section headings
  | 'subheading' // card titles, list item names
  | 'body'
  | 'small'
  | 'label'; // small caps: section eyebrows, button text

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: 'ink' | 'muted' | 'accent' | 'onInk';
  italic?: boolean;
  center?: boolean;
};

export function Text({ variant = 'body', tone, italic, center, style, ...rest }: TextProps) {
  const { colors, fonts } = useTheme();
  const serif = (size: number, lineHeight: number): TextStyle => ({
    fontFamily: italic ? fonts.displayItalic : fonts.display,
    fontSize: Math.round(size * fonts.displayScale),
    lineHeight: Math.round(lineHeight * fonts.displayScale),
    letterSpacing: fonts.displayTracking,
  });

  const variants: Record<TextVariant, TextStyle> = {
    display: serif(44, 46),
    title: serif(32, 36),
    heading: serif(25, 30),
    subheading: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 22, letterSpacing: 0.1 },
    body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25, letterSpacing: 0.1 },
    small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
    label: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      lineHeight: 16,
      letterSpacing: 2.2,
      textTransform: 'uppercase',
    },
  };

  const defaultTone = variant === 'small' ? 'muted' : 'ink';
  const color = { ink: colors.ink, muted: colors.muted, accent: colors.accent, onInk: colors.onInk }[
    tone ?? defaultTone
  ];

  return (
    <RNText
      {...rest}
      style={[variants[variant], { color }, center && { textAlign: 'center' }, style]}
    />
  );
}
