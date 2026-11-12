import { createSupabaseClient } from '@salon/api';
import { env } from './env';

let client: ReturnType<typeof createSupabaseClient> | null = null;

/** Lazily created so a missing env var only fails when data is first requested. */
export function supabase() {
  client ??= createSupabaseClient({ url: env.supabaseUrl, anonKey: env.supabaseAnonKey });
  return client;
}
