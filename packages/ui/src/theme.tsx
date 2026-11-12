import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { fontSets, type FontSet, type FontStyle } from './fonts';
import { DEFAULT_PALETTE, palettes, radius, space, type Palette, type PaletteName } from './tokens';

export type Theme = {
  colors: Palette;
  fonts: FontSet;
  fontStyle: FontStyle;
  space: typeof space;
  radius: typeof radius;
  isDark: boolean;
};

export type BrandInput = {
  /** Curated palette key from salon_branding.palette. Unknown keys fall back to the default. */
  palette?: string | null;
  /** Optional custom accent (hex) layered on top of the palette. */
  accent?: string | null;
  fontStyle?: FontStyle | null;
};

const HEX = /^#[0-9a-f]{6}$/i;

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Mix `hex` towards `into` by `amount` (0..1). */
export function mix(hex: string, into: string, amount: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(into.slice(1), 16);
  const ch = (shift: number) => {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    return Math.round(x + (y - x) * amount);
  };
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

/** Turn a salon's branding choices into a full theme. */
export function buildTheme(brand: BrandInput = {}): Theme {
  const name = (brand.palette && brand.palette in palettes ? brand.palette : DEFAULT_PALETTE) as PaletteName;
  let colors: Palette = palettes[name];
  if (brand.accent && HEX.test(brand.accent)) {
    colors = { ...colors, accent: brand.accent, accentSoft: mix(brand.accent, colors.background, 0.78) };
  }
  const fontStyle = brand.fontStyle ?? 'classic';
  return {
    colors,
    fonts: fontSets[fontStyle],
    fontStyle,
    space,
    radius,
    isDark: luminance(colors.background) < 0.2,
  };
}

export const defaultTheme = buildTheme();

const ThemeContext = createContext<Theme>(defaultTheme);

export function ThemeProvider({ brand, children }: PropsWithChildren<{ brand?: BrandInput }>) {
  const theme = useMemo(
    () => buildTheme(brand),
    [brand?.palette, brand?.accent, brand?.fontStyle], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
