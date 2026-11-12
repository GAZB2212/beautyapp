import { Redirect, useRouter } from 'expo-router';
import { View } from 'react-native';
import { Monogram, OptionRow, Text, useTheme } from '@salon/ui';
import { BookingShell } from '@/features/booking/BookingShell';
import { useBooking } from '@/features/booking/useBooking';

/** Step 2: choose a stylist, or leave it to the salon. Skipped when there is no choice to make. */
export default function ChooseStylist() {
  const { slug, service, stylists, showStylistStep, stepLabel } = useBooking();
  const { colors } = useTheme();
  const router = useRouter();

  if (!service) return <Redirect href={{ pathname: '/[slug]/book', params: { slug } }} />;
  if (!showStylistStep) {
    // Nothing to choose: one stylist offers this service, or the salon assigns stylists itself.
    const staff = stylists.length === 1 ? stylists[0]!.id : 'any';
    return <Redirect href={{ pathname: '/[slug]/book/time', params: { slug, service: service.id, staff } }} />;
  }

  const choose = (staff: string) => router.push({ pathname: '/[slug]/book/time', params: { slug, service: service.id, staff } });

  return (
    <BookingShell title="Choose your stylist" step={stepLabel('stylist')} fallback={{ pathname: '/[slug]/book', params: { slug } }}>
      <Text tone="muted" style={{ marginBottom: 8 }}>
        For {service.name}
      </Text>
      <OptionRow
        first
        title="Any stylist"
        subtitle="See the most times available"
        leading={
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="label" tone="muted" style={{ fontSize: 10, letterSpacing: 1.6 }}>
              Any
            </Text>
          </View>
        }
        onPress={() => choose('any')}
      />
      {stylists.map((m) => (
        <OptionRow
          key={m.id}
          title={m.name}
          subtitle={m.title ?? m.bio}
          leading={<Monogram name={m.name} size={56} />}
          onPress={() => choose(m.id)}
        />
      ))}
    </BookingShell>
  );
}
