import { useMutation } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { clientDetailsSchema, fieldErrors, formatMoney, type ClientDetailsInput } from '@salon/core';
import { Banner, Button, Checkbox, Text, TextField } from '@salon/ui';
import { BookingShell } from '@/features/booking/BookingShell';
import { Summary } from '@/features/booking/Summary';
import { useBooking } from '@/features/booking/useBooking';
import { createBooking } from '@/lib/data';

const EMPTY: ClientDetailsInput = { firstName: '', lastName: '', email: '', phone: '', note: '', marketingOptIn: false };

/** Step 4: the client's details, the salon's policy, and the final confirmation. */
export default function YourDetails() {
  const booking = useBooking();
  const { salon, slug, service, stylist, start, anyStylist, deposit, stepLabel } = booking;
  const router = useRouter();
  const rules = salon.booking_rules;

  const [form, setForm] = useState<ClientDetailsInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof ClientDetailsInput>(key: K, value: ClientDetailsInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const submit = useMutation({
    mutationFn: createBooking,
    onSuccess: (result) =>
      router.replace({
        pathname: '/[slug]/book/confirmed',
        params: {
          slug,
          service: service!.id,
          staff: stylist!.id,
          start: start!,
          ref: result.reference,
          ...(anyStylist ? { any: '1' } : {}),
          ...(result.preview ? { preview: '1' } : {}),
        },
      }),
  });

  if (!service || !stylist || !start) return <Redirect href={{ pathname: '/[slug]/book', params: { slug } }} />;

  const onConfirm = () => {
    const parsed = clientDetailsSchema({ requirePhone: rules.require_phone }).safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    submit.mutate({ slug, serviceId: service.id, staffId: stylist.id, startsAt: start, client: parsed.data });
  };

  const cancelText =
    rules.cancellation_window_hours > 0
      ? `You can cancel or reschedule free of charge up to ${rules.cancellation_window_hours} hours before your appointment.`
      : 'You can cancel or reschedule free of charge at any time before your appointment.';

  return (
    <BookingShell
      title="Your details"
      step={stepLabel('details')}
      fallback={{ pathname: '/[slug]/book/time', params: { slug, service: service.id, staff: anyStylist ? 'any' : stylist.id } }}
      footer={
        <Button
          block
          size="lg"
          disabled={submit.isPending}
          title={submit.isPending ? 'Booking…' : deposit > 0 ? `Pay ${formatMoney(deposit, salon.salon.currency)} deposit` : 'Confirm booking'}
          onPress={onConfirm}
        />
      }
    >
      <Summary booking={booking} />

      <View style={{ gap: 18, marginTop: 28 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <TextField
              label="First name"
              value={form.firstName}
              onChangeText={(v) => set('firstName', v)}
              error={errors.firstName}
              autoComplete="given-name"
              textContentType="givenName"
              autoCapitalize="words"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Last name"
              value={form.lastName}
              onChangeText={(v) => set('lastName', v)}
              error={errors.lastName}
              autoComplete="family-name"
              textContentType="familyName"
              autoCapitalize="words"
            />
          </View>
        </View>
        <TextField
          label="Email"
          value={form.email}
          onChangeText={(v) => set('email', v)}
          error={errors.email}
          hint="Your confirmation will be sent here."
          keyboardType="email-address"
          inputMode="email"
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextField
          label="Mobile"
          value={form.phone}
          onChangeText={(v) => set('phone', v)}
          error={errors.phone}
          hint="For your appointment reminder."
          optional={!rules.require_phone}
          keyboardType="phone-pad"
          inputMode="tel"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
        <TextField
          label="Anything we should know?"
          value={form.note}
          onChangeText={(v) => set('note', v)}
          error={errors.note}
          optional
          multiline
          maxLength={500}
        />
        <Checkbox
          checked={form.marketingOptIn}
          onChange={(v) => set('marketingOptIn', v)}
          label={`Send me occasional news and offers from ${salon.salon.name}.`}
        />
      </View>

      <View style={{ gap: 10, marginTop: 28 }}>
        {salon.branding.booking_message ? <Text variant="small">{salon.branding.booking_message}</Text> : null}
        <Text variant="small">{cancelText}</Text>
        {deposit > 0 ? (
          <Text variant="small">
            Your deposit secures the appointment and comes off the price on the day. It is paid directly to {salon.salon.name}.
          </Text>
        ) : null}
      </View>

      {submit.isError ? (
        <View style={{ marginTop: 20 }}>
          <Banner tone="error">
            {submit.error instanceof Error ? submit.error.message : 'Something went wrong.'} Your booking has not been made.
          </Banner>
        </View>
      ) : null}
    </BookingShell>
  );
}
