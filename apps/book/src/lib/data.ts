import { getAvailability, getStorefront, type AvailabilityQuery } from '@salon/api';
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
  // The server-side booking function arrives with the next step (it validates the slot,
  // creates the client and booking, and takes the deposit where required).
  void req;
  throw new Error('Online booking is not switched on yet.');
}

/** Public URL for a file in the salon-media storage bucket. */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path || isPreview) return undefined;
  return `${env.supabaseUrl}/storage/v1/object/public/salon-media/${path}`;
}
