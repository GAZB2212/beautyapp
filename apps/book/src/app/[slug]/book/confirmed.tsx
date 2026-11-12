import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button, Check, Container, Divider, Text, useTheme } from '@salon/ui';
import { Summary } from '@/features/booking/Summary';
import { useBooking } from '@/features/booking/useBooking';

/** Shown once a booking has been made. */
export default function Confirmed() {
  const booking = useBooking();
  const { salon, slug, service, stylist, start } = booking;
  const { ref, preview } = useLocalSearchParams<{ ref?: string; preview?: string }>();
  const { colors } = useTheme();
  const router = useRouter();

  if (!service || !stylist || !start) return <Redirect href={{ pathname: '/[slug]', params: { slug } }} />;
  const isPreview = preview === '1';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingVertical: 48 }}>
        <Container style={{ alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={22} />
          </View>
          <Text variant="label" tone="muted">
            {salon.salon.name}
          </Text>
          <Text variant="display" center accessibilityRole="header">
            {isPreview ? 'Booking preview' : 'You’re booked'}
          </Text>
          <Divider short />
          <Text center tone="muted" style={{ maxWidth: 420 }}>
            {isPreview
              ? 'This is how the confirmation will look.'
              : 'We’ve sent your confirmation by email. We look forward to seeing you.'}
          </Text>
        </Container>

        <Container style={{ marginTop: 32, gap: 16 }}>
          {isPreview ? (
            <Banner>Preview mode: no booking was made and nothing was sent. Live booking is switched on in the next step.</Banner>
          ) : null}
          <Summary booking={booking} />
          {ref && !isPreview ? (
            <Text variant="small" center>
              Booking reference {ref}
            </Text>
          ) : null}
          <Button
            title={`Back to ${salon.salon.name}`}
            variant="outline"
            block
            onPress={() => router.replace({ pathname: '/[slug]', params: { slug } })}
            style={{ marginTop: 8 }}
          />
        </Container>
      </ScrollView>
    </SafeAreaView>
  );
}
