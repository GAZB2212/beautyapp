import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@salon/db';

export type SupabaseClientOptions = {
  url: string;
  anonKey: string;
  /** Platform storage for the auth session (AsyncStorage on native, localStorage on web). */
  storage?: {
    getItem: (key: string) => Promise<string | null> | string | null;
    setItem: (key: string, value: string) => Promise<void> | void;
    removeItem: (key: string) => Promise<void> | void;
  };
};

export type TypedSupabaseClient = SupabaseClient<Database>;

export function createSupabaseClient(opts: SupabaseClientOptions): TypedSupabaseClient {
  if (!opts.url || !opts.anonKey) {
    throw new Error('Supabase URL and anon key are required (EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY)');
  }
  return createClient<Database>(opts.url, opts.anonKey, {
    auth: {
      storage: opts.storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: 'window' in globalThis,
    },
  });
}
