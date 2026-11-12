import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { formatDuration } from '@salon/core';
import { Chip, OptionRow, Text, useTheme } from '@salon/ui';
import { BookingShell } from '@/features/booking/BookingShell';
import { useBooking } from '@/features/booking/useBooking';
import { formatPrice, groupServices } from '@/features/salon/present';

/** Step 1: choose a service. */
export default function ChooseService() {
  const { salon, slug, stepLabel } = useBooking();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <BookingShell title="Choose a service" step={stepLabel('service')} fallback={{ pathname: '/[slug]', params: { slug } }}>
      {salon.services.length === 0 ? (
        <Text tone="muted">This salon has no services available to book online yet.</Text>
      ) : null}
      {groupServices(salon).map((group) => (
        <View key={group.name} style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 2 }}>
            <Text variant="label">{group.name}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.accent, opacity: 0.6 }} />
          </View>
          {group.services.map((v, i) => (
            <OptionRow
              key={v.id}
              first={i === 0}
              title={v.name}
              subtitle={v.description}
              meta={<Chip label={formatDuration(v.duration_min)} />}
              trailing={formatPrice(v.price_pence, salon.salon.currency, v.price_is_from)}
              onPress={() => router.push({ pathname: '/[slug]/book/stylist', params: { slug, service: v.id } })}
            />
          ))}
        </View>
      ))}
    </BookingShell>
  );
}
