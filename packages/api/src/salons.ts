import { z } from 'zod';
import type { MemberRole, SalonRow, SalonStatus } from '@salon/db';
import type { TypedSupabaseClient } from './client';
import { toApiError } from './errors';

export type Membership = { role: MemberRole; salon: Pick<SalonRow, 'id' | 'slug' | 'name' | 'status' | 'timezone' | 'currency'> };

/** The salons the signed-in user belongs to, with their role in each. */
export async function listMemberships(client: TypedSupabaseClient, userId: string): Promise<Membership[]> {
  const members = await client.from('salon_members').select('salon_id, role').eq('user_id', userId);
  if (members.error) throw toApiError(members.error);
  if (members.data.length === 0) return [];
  const salons = await client
    .from('salons')
    .select('id, slug, name, status, timezone, currency')
    .in('id', members.data.map((m) => m.salon_id))
    .order('name');
  if (salons.error) throw toApiError(salons.error);
  return salons.data.map((salon) => ({
    salon,
    role: members.data.find((m) => m.salon_id === salon.id)!.role,
  }));
}

export async function slugStatus(client: TypedSupabaseClient, slug: string): Promise<'available' | 'taken' | 'invalid'> {
  const { data, error } = await client.rpc('slug_status', { p_slug: slug });
  if (error) throw toApiError(error);
  return data;
}

const created = z.object({ id: z.guid(), slug: z.string() });

/** Create a salon owned by the signed-in user. Codes: slug_taken, invalid_slug, invalid_name, salon_limit, email_not_verified. */
export async function createSalon(client: TypedSupabaseClient, input: { name: string; slug: string }) {
  const { data, error } = await client.rpc('create_salon', { p_name: input.name, p_slug: input.slug });
  if (error) throw toApiError(error);
  return created.parse(data);
}

/** Join any salons that invited the signed-in user's confirmed email. Returns how many. */
export async function acceptInvites(client: TypedSupabaseClient): Promise<number> {
  const { data, error } = await client.rpc('accept_invites');
  if (error) throw toApiError(error);
  return data ?? 0;
}

/** Put a salon live or take it offline. Codes: needs_opening_hours, needs_bookable_service, not_allowed, salon_suspended. */
export async function setSalonPublished(client: TypedSupabaseClient, salonId: string, published: boolean): Promise<SalonStatus> {
  const { data, error } = await client.rpc('set_salon_published', { p_salon_id: salonId, p_published: published });
  if (error) throw toApiError(error);
  return data;
}
