/** Public runtime config. EXPO_PUBLIC_* vars are inlined at build time by Expo. */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  /** Where clients book, e.g. https://salonapp.co.uk */
  bookingOrigin: process.env.EXPO_PUBLIC_BOOKING_ORIGIN ?? 'http://localhost:8081',
};

export const isConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

/** This app's own address, for links in confirmation and password emails. */
export function appOrigin(): string {
  return typeof window !== 'undefined' && window.location ? window.location.origin : '';
}
