import { useQuery } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { createContext, useContext, type PropsWithChildren } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Storefront } from '@salon/core';
import { Button, Container, Divider, Text, ThemeProvider, buildTheme, fontAssets, type FontStyle } from '@salon/ui';
import { fetchStorefront } from '@/lib/data';

const SalonContext = createContext<Storefront | null>(null);

/** The salon this page belongs to. Only valid inside /[slug] routes. */
export function useSalon(): Storefront {
  const salon = useContext(SalonContext);
  if (!salon) throw new Error('useSalon must be used inside a salon route');
  return salon;
}

type Overrides = { palette?: string; font?: string };
const FONT_STYLES: FontStyle[] = ['classic', 'modern', 'editorial'];

/**
 * Loads one salon by slug, applies its branding, and shows nothing else until both the
 * data and its fonts are ready. Every screen under /[slug] is locked to this salon.
 */
export function SalonProvider({ slug, overrides, children }: PropsWithChildren<{ slug: string; overrides?: Overrides }>) {
  const query = useQuery({
    queryKey: ['storefront', slug],
    queryFn: () => fetchStorefront(slug),
    staleTime: 5 * 60_000,
  });

  const branding = query.data?.branding;
  const fontStyle: FontStyle = FONT_STYLES.includes(overrides?.font as FontStyle)
    ? (overrides!.font as FontStyle)
    : (branding?.font_style ?? 'classic');
  const brand = { palette: overrides?.palette ?? branding?.palette, accent: branding?.accent_color, fontStyle };
  const [fontsLoaded] = useFonts(fontAssets(fontStyle));
  const background = buildTheme(brand).colors.background;

  if (query.isPending || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: background }}>
        <ActivityIndicator color="#9A8F86" />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ThemeProvider>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Container style={{ alignItems: 'center', gap: 14 }}>
            <Text variant="title" center>
              {query.isError ? 'Something went wrong' : 'We can’t find that salon'}
            </Text>
            <Divider short />
            <Text center tone="muted" style={{ maxWidth: 380 }}>
              {query.isError
                ? 'Please check your connection and try again.'
                : 'The link may be mistyped, or the salon may no longer take online bookings.'}
            </Text>
            {query.isError ? (
              <Button title="Try again" variant="outline" onPress={() => query.refetch()} style={{ alignSelf: 'center', marginTop: 8 }} />
            ) : null}
          </Container>
        </View>
      </ThemeProvider>
    );
  }

  return (
    <SalonContext.Provider value={query.data}>
      <ThemeProvider brand={brand}>{children}</ThemeProvider>
    </SalonContext.Provider>
  );
}
