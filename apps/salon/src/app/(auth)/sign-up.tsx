import { useState } from 'react';
import { Banner, Button, Text, TextField } from '@salon/ui';
import { authErrorMessage } from '@/features/auth/AuthProvider';
import { AuthShell } from '@/features/auth/AuthShell';
import { TextLink } from '@/features/auth/TextLink';
import { appOrigin, isConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async () => {
    const address = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Please choose a password with at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase().auth.signUp({
      email: address,
      password,
      options: { emailRedirectTo: `${appOrigin()}/` },
    });
    setBusy(false);
    if (e) setError(authErrorMessage(e));
    else setSentTo(address);
  };

  if (sentTo) {
    return (
      <AuthShell
        title="Check your email"
        intro={`We’ve sent a link to ${sentTo}. Open it on this device to confirm your address and set up your salon.`}
        footer={<TextLink href="/sign-in">Back to sign in</TextLink>}
      >
        <Text variant="small" center>
          Can’t see it? Check your spam folder. The link works once.
        </Text>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your salon"
      intro="Start with your own sign-in. You’ll name your salon next."
      footer={<TextLink href="/sign-in">Already have an account? Sign in</TextLink>}
    >
      {!isConfigured ? <Banner>This preview isn’t connected to a database yet, so sign-up is switched off.</Banner> : null}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        inputMode="email"
        autoComplete="email"
        textContentType="username"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        hint="At least 8 characters."
        onSubmitEditing={submit}
      />
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Button title={busy ? 'Creating account…' : 'Create account'} size="lg" block disabled={busy || !isConfigured} onPress={submit} />
    </AuthShell>
  );
}
