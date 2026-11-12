import { createContext, useContext } from 'react';

/** Brand tokens derived from a salon's branding row. Defaults are the Salon App house style. */
export type Theme = {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  fontFamily: string;
  radius: number;
};

export const defaultTheme: Theme = {
  primary: '#1F1F1F',
  accent: '#C9A27E',
  background: '#FFFFFF',
  surface: '#F6F4F1',
  text: '#1F1F1F',
  muted: '#6B6B6B',
  fontFamily: 'System',
  radius: 12,
};

export const ThemeContext = createContext<Theme>(defaultTheme);
export const useTheme = () => useContext(ThemeContext);
