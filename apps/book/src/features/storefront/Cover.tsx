import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, View } from 'react-native';
import { Text, mix, useTheme } from '@salon/ui';

/**
 * Hero cover. Uses the salon's cover photo when there is one; otherwise a soft tonal
 * wash with the salon's initial, so a page never looks unfinished before photos are added.
 */
export function Cover({ name, coverUrl, height }: { name: string; coverUrl?: string; height: number }) {
  const { colors, fonts } = useTheme();
  if (coverUrl) {
    return (
      <View style={{ height }}>
        <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={`${name} salon`} />
        <LinearGradient
          colors={[colors.background + '00', colors.background + '00', colors.background]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }
  return (
    <View style={{ height, overflow: 'hidden' }}>
      <LinearGradient
        colors={[mix(colors.accent, colors.background, 0.35), colors.accentSoft, colors.background]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.center]} accessibilityElementsHidden>
        <Text
          style={{
            fontFamily: fonts.displayItalic,
            fontSize: height * 0.62,
            lineHeight: height * 0.74,
            color: colors.background,
            opacity: 0.55,
          }}
        >
          {name.trim().charAt(0)}
        </Text>
      </View>
      <LinearGradient
        colors={[colors.background + '00', colors.background]}
        locations={[0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
