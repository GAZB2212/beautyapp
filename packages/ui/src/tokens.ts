/**
 * Salon App design tokens.
 *
 * Direction: quiet luxury. Warm neutrals, generous whitespace, fine hairlines, an elegant
 * serif for display and a light geometric sans for everything else. Photography leads;
 * colour is used sparingly. The accent decorates (rules, chips, highlights) and never
 * carries body text, so every curated palette stays readable.
 */

export type Palette = {
  /** Page background */
  background: string;
  /** Cards, inputs, quiet fills */
  surface: string;
  /** Primary text and primary buttons */
  ink: string;
  /** Secondary text */
  muted: string;
  /** Hairlines and borders */
  line: string;
  /** Brand accent: decoration only */
  accent: string;
  /** Tint of the accent for soft fills (chips, selected states) */
  accentSoft: string;
  /** Text/icons placed on `ink` */
  onInk: string;
};

/** Curated palettes a salon can choose from. Each is designed as a whole. */
export const palettes = {
  champagne: {
    background: '#FBF8F4',
    surface: '#F4EEE7',
    ink: '#1D1B1A',
    muted: '#726A63',
    line: '#E6DDD3',
    accent: '#B8977A',
    accentSoft: '#EFE4D8',
    onInk: '#FBF8F4',
  },
  blush: {
    background: '#FDF9F7',
    surface: '#F8EDE9',
    ink: '#2A2022',
    muted: '#7A6765',
    line: '#EEDFD9',
    accent: '#C58F8A',
    accentSoft: '#F5E1DD',
    onInk: '#FDF9F7',
  },
  sage: {
    background: '#F9FAF6',
    surface: '#EEF1E9',
    ink: '#1E231F',
    muted: '#656E66',
    line: '#DDE3D8',
    accent: '#8A9A82',
    accentSoft: '#E3E9DE',
    onInk: '#F9FAF6',
  },
  mocha: {
    background: '#FAF6F2',
    surface: '#F1E8E0',
    ink: '#2B211C',
    muted: '#74645D',
    line: '#E4D8CD',
    accent: '#8C6A56',
    accentSoft: '#EADCD0',
    onInk: '#FAF6F2',
  },
  lilac: {
    background: '#FBF9FD',
    surface: '#F2EDF7',
    ink: '#221F2A',
    muted: '#6E677A',
    line: '#E2DBEA',
    accent: '#9C8AB8',
    accentSoft: '#E9E2F2',
    onInk: '#FBF9FD',
  },
  noir: {
    background: '#121111',
    surface: '#1C1A19',
    ink: '#F5F0EA',
    muted: '#A39A92',
    line: '#2E2A28',
    accent: '#C9A27E',
    accentSoft: '#2A2420',
    onInk: '#121111',
  },
} as const satisfies Record<string, Palette>;

export type PaletteName = keyof typeof palettes;
export const DEFAULT_PALETTE: PaletteName = 'champagne';

/** 4pt spacing scale */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, huge: 72 } as const;

export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

/** Content widths (web/tablet): reading column and wide dashboard column */
export const widths = { column: 640, wide: 1120 } as const;
