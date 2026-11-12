import { useLocalSearchParams } from 'expo-router';
import { depositFor, type Storefront, type StorefrontService } from '@salon/core';
import { useSalon } from '@/features/salon/SalonContext';

type Staff = Storefront['staff'][number];

export type BookingSelection = {
  salon: Storefront;
  slug: string;
  service?: StorefrontService;
  /** Stylists who offer the chosen service */
  stylists: Staff[];
  /** The chosen (or assigned) stylist */
  stylist?: Staff;
  /** True when the client asked for "any stylist" */
  anyStylist: boolean;
  /** Chosen start time (ISO instant) */
  start?: string;
  /** Whether the client gets to pick a stylist at all */
  showStylistStep: boolean;
  /** Deposit due now, in pence (0 when the salon cannot take online payments yet) */
  deposit: number;
  stepLabel: (step: 'service' | 'stylist' | 'time' | 'details') => string;
};

/**
 * The booking in progress, read from the URL (?service=&staff=&start=) and checked against
 * the salon's data. Keeping it in the URL means back, refresh and shared links all work.
 */
export function useBooking(): BookingSelection {
  const salon = useSalon();
  const p = useLocalSearchParams<{ service?: string; staff?: string; start?: string; any?: string }>();

  const service = salon.services.find((s) => s.id === p.service);
  const stylists = service ? salon.staff.filter((m) => service.staff_ids.includes(m.id)) : [];
  const stylist = stylists.find((m) => m.id === p.staff);
  const anyStylist = p.staff === 'any' || p.any === '1';
  const start = p.start && !Number.isNaN(Date.parse(p.start)) ? p.start : undefined;
  // Before a service is chosen, assume the stylist step applies if the salon has a choice of stylists.
  const showStylistStep =
    salon.booking_rules.allow_staff_choice && (service ? stylists.length > 1 : salon.staff.length > 1);
  const deposit = service && salon.salon.online_payments ? depositFor(service, salon.booking_rules) : 0;

  const order = (['service', showStylistStep ? 'stylist' : null, 'time', 'details'] as const).filter(Boolean);
  const stepLabel: BookingSelection['stepLabel'] = (step) => `Step ${order.indexOf(step) + 1} of ${order.length}`;

  return { salon, slug: salon.salon.slug, service, stylists, stylist, anyStylist, start, showStylistStep, deposit, stepLabel };
}
