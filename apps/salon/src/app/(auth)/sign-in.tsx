import { useState } from 'react';
import { Banner, Button, TextField } from '@salon/ui';
import { authErrorMessage } from '@/features/auth/AuthProvider';
import { AuthShell } from '@/features/auth/AuthShell';
import { TextLink } from '@/features/auth/TextLink';
import { isConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (e) setError(authErrorMessage(e));
    // On success the auth layout redirects to the dashboard.
  };

  return (
    <AuthShell
      title="Welcome back"
      footer={
        <>
          <TextLink href="/forgot-password">Forgot your password?</TextLink>
          <TextLink href="/sign-up">New here? Create your salon</TextLink>
        </>
      }
    >
      {!isConfigured ? <Banner>This preview isn’t connected to a database yet, so signing in is switched off.</Banner> : null}
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
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
      />
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Button title={busy ? 'Signing in…' : 'Sign in'} size="lg" block disabled={busy || !isConfigured} onPress={submit} />
    </AuthShell>
  );
}
