import { useFonts } from 'expo-font';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { ThemeProvider, buildTheme, fontAssets, type FontStyle } from '@salon/ui';
import { StorefrontClassic } from '@/features/storefront/StorefrontClassic';
import { sampleStorefront } from '@/features/storefront/sample';

const FONT_STYLES: FontStyle[] = ['classic', 'modern', 'editorial'];

/**
 * Salon storefront at /<slug>. Sample content for now (see features/storefront/sample.ts).
 * For design review, ?palette=blush&font=editorial previews other branding choices.
 */
export default function SalonPage() {
  const params = useLocalSearchParams<{ slug: string; palette?: string; font?: string }>();
  const salon = sampleStorefront;
  const fontStyle = FONT_STYLES.includes(params.font as FontStyle) ? (params.font as FontStyle) : salon.branding.fontStyle;
  const brand = { palette: params.palette ?? salon.branding.palette, accent: salon.branding.accent, fontStyle };

  const [fontsLoaded] = useFonts(fontAssets(fontStyle));
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: buildTheme(brand).colors.background }} />;
  }

  return (
    <ThemeProvider brand={brand}>
      <StorefrontClassic salon={salon} onBook={() => {}} />
    </ThemeProvider>
  );
}
