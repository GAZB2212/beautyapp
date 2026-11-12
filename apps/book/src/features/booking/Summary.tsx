import { dateKeyOf, formatDayLong, formatDuration, formatMoney, formatTime } from '@salon/core';
import { Card, Divider, SummaryLine, Text } from '@salon/ui';
import { formatPrice } from '@/features/salon/present';
import type { BookingSelection } from './useBooking';

/** The appointment being booked, as a card. Used on the details and confirmation screens. */
export function Summary({ booking }: { booking: BookingSelection }) {
  const { salon, service, stylist, anyStylist, start, deposit } = booking;
  if (!service || !start) return null;
  const tz = salon.salon.timezone;
  const currency = salon.salon.currency;

  return (
    <Card style={{ gap: 2 }}>
      <Text variant="heading" style={{ fontSize: 23, lineHeight: 28 }}>
        {service.name}
      </Text>
      <Text tone="muted" style={{ marginBottom: 10 }}>
        {formatDayLong(dateKeyOf(start, tz))} at {formatTime(start, tz)}
      </Text>
      <Divider style={{ marginBottom: 8 }} />
      {stylist ? <SummaryLine label={anyStylist ? 'Your stylist will be' : 'Stylist'} value={stylist.name} /> : null}
      <SummaryLine label="Duration" value={formatDuration(service.duration_min)} />
      <SummaryLine label="Price" value={formatPrice(service.price_pence, currency, service.price_is_from)} />
      {deposit > 0 ? (
        <>
          <Divider style={{ marginVertical: 8 }} />
          <SummaryLine label="Deposit due now" value={formatMoney(deposit, currency)} strong />
          <SummaryLine
            label="To pay at the salon"
            value={formatPrice(Math.max(service.price_pence - deposit, 0), currency, service.price_is_from)}
          />
        </>
      ) : null}
    </Card>
  );
}
