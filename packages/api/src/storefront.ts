import { availabilitySchema, storefrontSchema, type AvailabilitySlot, type Storefront } from '@salon/core';
import type { TypedSupabaseClient } from './client';
import { toApiError } from './errors';

/** Load a salon's public page. Returns null when the salon does not exist or is not live. */
export async function getStorefront(client: TypedSupabaseClient, slug: string): Promise<Storefront | null> {
  const { data, error } = await client.rpc('get_storefront', { p_slug: slug });
  if (error) throw toApiError(error);
  if (data == null) return null;
  return storefrontSchema.parse(data);
}

export type AvailabilityQuery = {
  slug: string;
  serviceId: string;
  /** First day to search, as YYYY-MM-DD in the salon's local calendar */
  from: string;
  /** Number of days to search (1–31) */
  days?: number;
  /** Limit to one stylist; omit for "any stylist" */
  staffId?: string;
};

/** Free appointment start times, earliest first. */
export async function getAvailability(client: TypedSupabaseClient, q: AvailabilityQuery): Promise<AvailabilitySlot[]> {
  const { data, error } = await client.rpc('get_availability', {
    p_slug: q.slug,
    p_service_id: q.serviceId,
    p_from: q.from,
    p_days: q.days ?? 14,
    p_staff_id: q.staffId ?? null,
  });
  if (error) throw toApiError(error);
  return availabilitySchema.parse(data ?? []);
}
