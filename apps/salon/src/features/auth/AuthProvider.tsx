import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { isConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';

type AuthState = {
  /** null while signed out; undefined while the saved session is still being read */
  session: Session | null | undefined;
  /** True when the user arrived from a "reset my password" email */
  recovering: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({ session: undefined, recovering: false, signOut: async () => {} });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null | undefined>(isConfigured ? undefined : null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!isConfigured) return;
    const client = supabase();
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = client.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'USER_UPDATED' || event === 'SIGNED_OUT') setRecovering(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({ session, recovering, signOut: async () => void (await supabase().auth.signOut()) }),
    [session, recovering],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Plain words for the things sign-in and sign-up can say no to. */
export function authErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
  switch (error?.code) {
    case 'invalid_credentials':
      return 'That email and password don’t match. Please try again.';
    case 'email_not_confirmed':
      return 'Please confirm your email address first. We sent you a link when you signed up.';
    case 'weak_password':
      return 'Please choose a password with at least 8 characters.';
    case 'user_already_exists':
    case 'email_exists':
      return 'There is already an account with that email. Try signing in instead.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many attempts. Please wait a minute and try again.';
    case 'same_password':
      return 'Please choose a password you haven’t used before.';
    default:
      return /fetch|network/i.test(error?.message ?? '')
        ? 'We couldn’t connect. Please check your internet connection.'
        : 'Something went wrong. Please try again.';
  }
}
