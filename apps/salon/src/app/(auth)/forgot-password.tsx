import { useState } from 'react';
import { Banner, Button, TextField } from '@salon/ui';
import { authErrorMessage } from '@/features/auth/AuthProvider';
import { AuthShell } from '@/features/auth/AuthShell';
import { TextLink } from '@/features/auth/TextLink';
import { appOrigin, isConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${appOrigin()}/reset-password` });
    setBusy(false);
    if (e) setError(authErrorMessage(e));
    else setSent(true);
  };

  return (
    <AuthShell
      title={sent ? 'Check your email' : 'Reset your password'}
      intro={
        sent
          ? 'If there is an account for that address, we’ve sent a link to choose a new password.'
          : 'Enter the email you sign in with and we’ll send you a link.'
      }
      footer={<TextLink href="/sign-in">Back to sign in</TextLink>}
    >
      {sent ? null : (
        <>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={submit}
          />
          {error ? <Banner tone="error">{error}</Banner> : null}
          <Button title={busy ? 'Sending…' : 'Send reset link'} size="lg" block disabled={busy || !isConfigured} onPress={submit} />
        </>
      )}
    </AuthShell>
  );
}
