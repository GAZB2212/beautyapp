import type { FontStyle } from '@salon/ui';

/** Everything the public storefront needs. Mirrors the public_* views (step 1/4). */
export type Storefront = {
  slug: string;
  name: string;
  tagline?: string;
  about?: string;
  city?: string;
  addressLine?: string;
  phone?: string;
  instagram?: string;
  branding: { palette: string; accent?: string; fontStyle: FontStyle; coverUrl?: string };
  categories: { name: string; services: StorefrontService[] }[];
  team: { id: string; name: string; role?: string; photoUrl?: string }[];
  hours: { day: string; open?: string; close?: string }[];
};

export type StorefrontService = {
  id: string;
  name: string;
  description?: string;
  durationMin: number;
  pricePence: number;
  priceIsFrom?: boolean;
};
