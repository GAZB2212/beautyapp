import { z } from 'zod';
import type { ClientDetails } from '@salon/core';
import type { TypedSupabaseClient } from './client';
import { toApiError } from './errors';

export type BookAppointmentInput = {
  slug: string;
  serviceId: string;
  staffId: string;
  /** ISO instant, exactly as returned by getAvailability */
  startsAt: string;
  client: ClientDetails;
};

const resultSchema = z.object({
  reference: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  manage_token: z.string(),
});
export type BookAppointmentResult = z.infer<typeof resultSchema>;

/**
 * Book an appointment that needs no deposit. Throws ApiError with a code such as
 * 'slot_unavailable', 'deposit_required', 'too_many_bookings' or 'try_later'.
 */
export async function bookAppointment(client: TypedSupabaseClient, input: BookAppointmentInput): Promise<BookAppointmentResult> {
  const { data, error } = await client.rpc('book_appointment', {
    p_slug: input.slug,
    p_service_id: input.serviceId,
    p_staff_id: input.staffId,
    p_starts_at: input.startsAt,
    p_first_name: input.client.firstName,
    p_last_name: input.client.lastName,
    p_email: input.client.email,
    p_phone: input.client.phone,
    p_note: input.client.note || null,
    p_marketing_opt_in: input.client.marketingOptIn,
  });
  if (error) throw toApiError(error);
  return resultSchema.parse(data);
}
