import { z } from 'zod';

/**
 * Shape of `get_storefront(slug)`: everything the public booking page may know about a
 * salon. Parsed at runtime so a schema drift shows up as a clear error, not a blank page.
 */
const moneyRule = z.enum(['none', 'fixed', 'percent']);

export const storefrontSchema = z.object({
  salon: z.object({
    id: z.guid(),
    slug: z.string(),
    name: z.string(),
    timezone: z.string(),
    currency: z.string(),
    address_line1: z.string().nullable(),
    address_line2: z.string().nullable(),
    city: z.string().nullable(),
    postcode: z.string().nullable(),
    country: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    online_payments: z.boolean(),
  }),
  branding: z.object({
    logo_path: z.string().nullable(),
    cover_path: z.string().nullable(),
    palette: z.string(),
    primary_color: z.string().nullable(),
    accent_color: z.string().nullable(),
    font_style: z.enum(['modern', 'classic', 'editorial']),
    layout: z.enum(['classic', 'editorial', 'minimal']),
    tagline: z.string().nullable(),
    about: z.string().nullable(),
    booking_message: z.string().nullable(),
    instagram: z.string().nullable(),
    facebook: z.string().nullable(),
    tiktok: z.string().nullable(),
    website: z.string().nullable(),
    whatsapp: z.string().nullable(),
  }),
  booking_rules: z.object({
    deposit_type: moneyRule,
    deposit_value: z.number().int(),
    cancellation_window_hours: z.number().int(),
    no_show_fee_type: moneyRule,
    no_show_fee_value: z.number().int(),
    min_notice_hours: z.number().int(),
    max_advance_days: z.number().int(),
    allow_staff_choice: z.boolean(),
    require_phone: z.boolean(),
  }),
  hours: z.array(z.object({ weekday: z.number().int().min(0).max(6), opens_at: z.string(), closes_at: z.string() })),
  categories: z.array(z.object({ id: z.guid(), name: z.string() })),
  services: z.array(
    z.object({
      id: z.guid(),
      category_id: z.guid().nullable(),
      name: z.string(),
      description: z.string().nullable(),
      duration_min: z.number().int(),
      price_pence: z.number().int(),
      price_is_from: z.boolean(),
      image_path: z.string().nullable(),
      deposit_override_pence: z.number().int().nullable(),
      staff_ids: z.array(z.guid()),
    }),
  ),
  staff: z.array(
    z.object({
      id: z.guid(),
      name: z.string(),
      title: z.string().nullable(),
      bio: z.string().nullable(),
      avatar_path: z.string().nullable(),
    }),
  ),
  gallery: z.array(z.object({ path: z.string(), caption: z.string().nullable() })),
});

export type Storefront = z.infer<typeof storefrontSchema>;
export type StorefrontService = Storefront['services'][number];

export const availabilitySchema = z.array(z.object({ staff_id: z.guid(), starts_at: z.string() }));
export type AvailabilitySlot = z.infer<typeof availabilitySchema>[number];

/**
 * Deposit due for a service under a salon's rules, in pence.
 * The server recalculates this when the booking is created; this is for display only.
 */
export function depositFor(
  service: Pick<StorefrontService, 'price_pence' | 'deposit_override_pence'>,
  rules: Pick<Storefront['booking_rules'], 'deposit_type' | 'deposit_value'>,
): number {
  if (service.deposit_override_pence != null) return Math.min(service.deposit_override_pence, service.price_pence);
  switch (rules.deposit_type) {
    case 'fixed':
      return Math.min(rules.deposit_value, service.price_pence);
    case 'percent':
      return Math.round((service.price_pence * Math.min(rules.deposit_value, 100)) / 100);
    default:
      return 0;
  }
}
