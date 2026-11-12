import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { createSalon, errorCode, slugStatus } from '@salon/api';
import { isValidSlug, toSlug } from '@salon/core';
import { Banner, Button, Text, TextField } from '@salon/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthShell } from '@/features/auth/AuthShell';
import { useRefreshMemberships } from '@/features/salon/CurrentSalon';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

const MESSAGES: Record<string, string> = {
  slug_taken: 'That link is already taken. Please choose another.',
  invalid_slug: 'Links can use lowercase letters, numbers and hyphens, and must be 3 to 40 characters.',
  invalid_name: 'Please enter your salon’s name.',
  salon_limit: 'You’ve reached the number of salons one account can own. Please get in touch if you need more.',
  email_not_verified: 'Please confirm your email address first, using the link we sent you.',
};

/** First run: name the salon and choose its booking link. */
export default function Welcome() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const refresh = useRefreshMemberships();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = slugEdited ? slug : toSlug(name);
  const wellFormed = isValidSlug(link);
  const status = useQuery({
    queryKey: ['slug', link],
    queryFn: () => slugStatus(supabase(), link),
    enabled: !!session && wellFormed,
    staleTime: 10_000,
  });

  if (session === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#9A8F86" />
      </View>
    );
  }
  if (!session) return <Redirect href="/sign-in" />;

  const host = env.bookingOrigin.replace(/^https?:\/\//, '');
  const linkError =
    link && !wellFormed ? MESSAGES.invalid_slug : status.data === 'taken' ? MESSAGES.slug_taken : status.data === 'invalid' ? MESSAGES.invalid_slug : undefined;
  const linkHint = !link
    ? `Your clients will book at ${host}/your-salon`
    : status.data === 'available'
      ? `Available. Your clients will book at ${host}/${link}`
      : `${host}/${link}`;

  const submit = async () => {
    if (!name.trim()) return setError(MESSAGES.invalid_name!);
    if (!wellFormed) return setError(MESSAGES.invalid_slug!);
    setBusy(true);
    setError(null);
    try {
      await createSalon(supabase(), { name, slug: link });
      await refresh();
      router.replace('/');
    } catch (e) {
      setError(MESSAGES[errorCode(e)] ?? 'Something went wrong. Please try again.');
      status.refetch();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Name your salon"
      intro="This is what clients will see. You can change the name later; the link is permanent once you print your QR code, so choose it with care."
      footer={
        <Pressable accessibilityRole="button" onPress={signOut} hitSlop={10}>
          <Text variant="label" tone="muted" style={{ textDecorationLine: 'underline' }}>
            Sign out
          </Text>
        </Pressable>
      }
    >
      <TextField label="Salon name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="e.g. Sarah’s Hair" />
      <TextField
        label="Booking link"
        value={link}
        onChangeText={(v) => {
          setSlugEdited(true);
          setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''));
        }}
        autoCapitalize="none"
        autoCorrect={false}
        error={linkError}
        hint={linkHint}
      />
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Button
        title={busy ? 'Creating…' : 'Create salon'}
        size="lg"
        block
        disabled={busy || !name.trim() || !wellFormed || status.data === 'taken'}
        onPress={submit}
      />
    </AuthShell>
  );
}
