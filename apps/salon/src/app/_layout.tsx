import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, defaultTheme, fontAssets } from '@salon/ui';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  // House style fonts. Salon storefronts load their own pairing on top of this.
  const [fontsLoaded] = useFonts(fontAssets('classic'));
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: defaultTheme.colors.background } }} />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
