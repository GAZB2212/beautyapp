/**
 * Server functions raise short codes ('slot_unavailable', 'slug_taken', …) as the error
 * message. ApiError carries that code so screens can show the right words.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'ApiError';
  }
}

const CODE = /^[a-z][a-z0-9_]{2,40}$/;

/** Turn a Supabase/PostgREST error into an ApiError with a stable code. */
export function toApiError(error: { message?: string; code?: string } | null | undefined): ApiError {
  const message = error?.message ?? '';
  if (CODE.test(message)) return new ApiError(message);
  if (error?.code === '42501') return new ApiError('not_allowed', message);
  if (error?.code === '23P01') return new ApiError('slot_unavailable', message);
  if (/fetch|network/i.test(message)) return new ApiError('network', message);
  return new ApiError('unknown', message);
}

export function errorCode(e: unknown): string {
  return e instanceof ApiError ? e.code : 'unknown';
}
