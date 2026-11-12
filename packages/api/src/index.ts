export { createSupabaseClient, type SupabaseClientOptions, type TypedSupabaseClient } from './client';
export { ApiError, errorCode, toApiError } from './errors';
export { getStorefront, getAvailability, type AvailabilityQuery } from './storefront';
export { bookAppointment, type BookAppointmentInput, type BookAppointmentResult } from './booking';
export { acceptInvites, createSalon, listMemberships, setSalonPublished, slugStatus, type Membership } from './salons';
