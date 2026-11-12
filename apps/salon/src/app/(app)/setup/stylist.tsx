import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { toApiError } from '@salon/api';
import { Banner, Button, Monogram, Text, TextField } from '@salon/ui';
import { AppShell } from '@/features/salon/AppShell';
import { useCurrentSalon } from '@/features/salon/CurrentSalon';
import { linkEveryoneToEverything, useRefreshSetup, useSetup } from '@/features/salon/setup';
import { supabase } from '@/lib/supabase';

/** Add a stylist. While getting started, every stylist offers every service. */
export default function Stylist() {
  const { salon } = useCurrentSalon();
  const router = useRouter();
  const setup = useSetup(salon.id);
  const refresh = useRefreshSetup(salon.id);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) return setError('Please enter the stylist’s name.');
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await supabase()
        .from('staff')
        .insert({ salon_id: salon.id, name: name.trim(), title: title.trim() || null, sort_order: setup.data?.staff.length ?? 0 });
      if (e) throw toApiError(e);
      await linkEveryoneToEverything(salon.id);
      await refresh();
      router.replace('/');
    } catch {
      setError('We couldn’t save that stylist. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const existing = setup.data?.staff ?? [];
  return (
    <AppShell
      title={existing.length ? 'Add a stylist' : 'Your first stylist'}
      eyebrow="Step 2 of 3"
      back="/"
      footer={<Button title={busy ? 'Saving…' : 'Save stylist'} size="lg" block disabled={busy} onPress={save} />}
    >
      <Text tone="muted" style={{ marginBottom: 20 }}>
        Clients choose who they book with. If you work alone, add yourself.
      </Text>
      {existing.length > 0 ? (
        <View style={{ gap: 12, marginBottom: 24 }}>
          {existing.map((m) => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Monogram name={m.name} size={40} />
              <View>
                <Text variant="subheading">{m.name}</Text>
                {m.title ? <Text variant="small">{m.title}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ gap: 18 }}>
        <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="e.g. Sarah Whitmore" />
        <TextField label="Title" value={title} onChangeText={setTitle} optional autoCapitalize="words" placeholder="e.g. Senior Stylist" />
        {error ? <Banner tone="error">{error}</Banner> : null}
      </View>
    </AppShell>
  );
}
