import { Stack, useGlobalSearchParams, useLocalSearchParams } from 'expo-router';
import { SalonProvider } from '@/features/salon/SalonContext';

/** Everything under /<slug> belongs to one salon and wears its branding. */
export default function SalonLayout() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  // ?palette= and ?font= preview other branding choices (used for design review)
  const { palette, font } = useGlobalSearchParams<{ palette?: string; font?: string }>();
  return (
    <SalonProvider slug={String(slug).toLowerCase()} overrides={{ palette, font }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </SalonProvider>
  );
}
