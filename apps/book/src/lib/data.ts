import { bookAppointment, errorCode, getAvailability, getStorefront, type AvailabilityQuery } from '@salon/api';
import type { AvailabilitySlot, ClientDetails, Storefront } from '@salon/core';
import { env } from './env';
import { sampleAvailability, sampleStorefront } from './sample';
import { supabase } from './supabase';

/**
 * True when no Supabase project is configured. The app then runs on built-in sample data
 * and never pretends a real booking was made.
 */
export const isPreview = !env.supabaseUrl || !env.supabaseAnonKey;

export async function fetchStorefront(slug: string): Promise<Storefront | null> {
  if (isPreview) return { ...sampleStorefront, salon: { ...sampleStorefront.salon, slug } };
  return getStorefront(supabase(), slug);
}

export async function fetchAvailability(q: AvailabilityQuery): Promise<AvailabilitySlot[]> {
  if (isPreview) return sampleAvailability({ serviceId: q.serviceId, from: q.from, days: q.days ?? 14, staffId: q.staffId });
  return getAvailability(supabase(), q);
}

export type BookingRequest = {
  slug: string;
  serviceId: string;
  staffId: string;
  startsAt: string;
  client: ClientDetails;
};

export type BookingResult = { reference: string; preview: boolean };

export async function createBooking(req: BookingRequest): Promise<BookingResult> {
  if (isPreview) {
    await new Promise((r) => setTimeout(r, 600));
    return { reference: 'PREVIEW', preview: true };
  }
  const result = await bookAppointment(supabase(), req);
  return { reference: result.reference, preview: false };
}

/** Words for the things that can go wrong when booking. */
export function bookingErrorMessage(e: unknown): { message: string; pickAnotherTime?: boolean } {
  switch (errorCode(e)) {
    case 'slot_unavailable':
      return { message: 'Sorry, that time has just been taken. Please choose another.', pickAnotherTime: true };
    case 'too_many_bookings':
      return { message: 'You already have several upcoming appointments. Please contact the salon to book another.' };
    case 'try_later':
      return { message: 'The salon’s diary is very busy right now. Please try again in a little while.' };
    case 'deposit_required':
      return { message: 'This appointment needs a deposit, and online payment isn’t available yet. Please contact the salon to book.' };
    case 'salon_not_found':
    case 'service_unavailable':
      return { message: 'This appointment can no longer be booked online. Please go back and choose again.' };
    case 'invalid_email':
      return { message: 'Please check your email address.' };
    case 'invalid_phone':
    case 'phone_required':
      return { message: 'Please check your mobile number.' };
    case 'network':
      return { message: 'We couldn’t reach the salon’s diary. Please check your connection and try again.' };
    default:
      return { message: 'Something went wrong on our side. Please try again.' };
  }
}

/** Public URL for a file in the salon-media storage bucket. */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path || isPreview) return undefined;
  return `${env.supabaseUrl}/storage/v1/object/public/salon-media/${path}`;
}
