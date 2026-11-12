import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Banner, Button, TextField } from '@salon/ui';
import { authErrorMessage, useAuth } from '@/features/auth/AuthProvider';
import { AuthShell } from '@/features/auth/AuthShell';
import { supabase } from '@/lib/supabase';

/** Reached from the link in a "reset my password" email, which signs the user in first. */
export default function ResetPassword() {
  const { session } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#9A8F86" />
      </View>
    );
  }
  if (!session) return <Redirect href="/forgot-password" />;

  const submit = async () => {
    if (password.length < 8) {
      setError('Please choose a password with at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (e) setError(authErrorMessage(e));
    else router.replace('/');
  };

  return (
    <AuthShell title="Choose a new password">
      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        hint="At least 8 characters."
        onSubmitEditing={submit}
      />
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Button title={busy ? 'Saving…' : 'Save password'} size="lg" block disabled={busy} onPress={submit} />
    </AuthShell>
  );
}
