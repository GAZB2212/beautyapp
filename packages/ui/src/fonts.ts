import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond/500Medium';
import { CormorantGaramond_500Medium_Italic } from '@expo-google-fonts/cormorant-garamond/500Medium_Italic';
import { Jost_300Light } from '@expo-google-fonts/jost/300Light';
import { Jost_400Regular } from '@expo-google-fonts/jost/400Regular';
import { Jost_500Medium } from '@expo-google-fonts/jost/500Medium';
import { PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display/400Regular';
import { PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display/400Regular_Italic';

/** The three type pairings a salon can choose between (salon_branding.font_style). */
export type FontStyle = 'classic' | 'modern' | 'editorial';

export type FontSet = {
  /** Headlines and the salon name */
  display: string;
  /** Italic display, used for a single emphasised word or tagline */
  displayItalic: string;
  body: string;
  bodyMedium: string;
  /** Display sizes are tuned per face so the three pairings feel equally weighted */
  displayScale: number;
  /** Letter spacing for display text, in px at 1x scale */
  displayTracking: number;
};

export const fontSets: Record<FontStyle, FontSet> = {
  // Soft, romantic serif. The default.
  classic: {
    display: 'CormorantGaramond_500Medium',
    displayItalic: 'CormorantGaramond_500Medium_Italic',
    body: 'Jost_400Regular',
    bodyMedium: 'Jost_500Medium',
    displayScale: 1.12,
    displayTracking: -0.2,
  },
  // Light geometric sans throughout. Minimal, fashion-led.
  modern: {
    display: 'Jost_300Light',
    displayItalic: 'Jost_300Light',
    body: 'Jost_400Regular',
    bodyMedium: 'Jost_500Medium',
    displayScale: 0.94,
    displayTracking: 0.4,
  },
  // High-contrast magazine serif.
  editorial: {
    display: 'PlayfairDisplay_400Regular',
    displayItalic: 'PlayfairDisplay_400Regular_Italic',
    body: 'Jost_400Regular',
    bodyMedium: 'Jost_500Medium',
    displayScale: 0.92,
    displayTracking: -0.4,
  },
};

const shared = { Jost_400Regular, Jost_500Medium };

/** Font files to load for a pairing. Only the chosen pairing is fetched. */
export function fontAssets(style: FontStyle): Record<string, number> {
  switch (style) {
    case 'modern':
      return { ...shared, Jost_300Light };
    case 'editorial':
      return { ...shared, PlayfairDisplay_400Regular, PlayfairDisplay_400Regular_Italic };
    case 'classic':
    default:
      return { ...shared, CormorantGaramond_500Medium, CormorantGaramond_500Medium_Italic };
  }
}
