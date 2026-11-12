import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { toApiError } from '@salon/api';
import { formatDuration, formatMoney } from '@salon/core';
import { Banner, Button, Text, TextField } from '@salon/ui';
import { AppShell } from '@/features/salon/AppShell';
import { useCurrentSalon } from '@/features/salon/CurrentSalon';
import { linkEveryoneToEverything, useRefreshSetup, useSetup } from '@/features/salon/setup';
import { supabase } from '@/lib/supabase';

/** Add a service: name, how long it takes, and its price. */
export default function Service() {
  const { salon } = useCurrentSalon();
  const router = useRouter();
  const setup = useSetup(salon.id);
  const refresh = useRefreshSetup(salon.id);
  const [name, setName] = useState('');
  const [minutes, setMinutes] = useState('60');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const duration = Number(minutes);
    const pence = Math.round(Number(price.replace(/[£,\s]/g, '')) * 100);
    if (!name.trim()) return setError('Please enter the service’s name.');
    if (!Number.isInteger(duration) || duration < 5 || duration > 600) return setError('Please enter how long it takes, between 5 and 600 minutes.');
    if (price.trim() === '' || !Number.isFinite(pence) || pence < 0) return setError('Please enter a price, for example 48 or 48.50.');
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await supabase()
        .from('services')
        .insert({ salon_id: salon.id, name: name.trim(), duration_min: duration, price_pence: pence, sort_order: setup.data?.services.length ?? 0 });
      if (e) throw toApiError(e);
      await linkEveryoneToEverything(salon.id);
      await refresh();
      router.replace('/');
    } catch {
      setError('We couldn’t save that service. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const existing = setup.data?.services ?? [];
  return (
    <AppShell
      title={existing.length ? 'Add a service' : 'Your first service'}
      eyebrow="Step 3 of 3"
      back="/"
      footer={<Button title={busy ? 'Saving…' : 'Save service'} size="lg" block disabled={busy} onPress={save} />}
    >
      <Text tone="muted" style={{ marginBottom: 20 }}>
        Start with your most popular service. You can add the rest of your menu, with descriptions and categories, afterwards.
      </Text>
      {existing.length > 0 ? (
        <View style={{ gap: 8, marginBottom: 24 }}>
          {existing.map((v) => (
            <View key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text>{v.name}</Text>
              <Text tone="muted">
                {formatDuration(v.duration_min)} · {formatMoney(v.price_pence, salon.currency).replace(/\.00$/, '')}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ gap: 18 }}>
        <TextField label="Service name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="e.g. Cut & Blow Dry" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <TextField label="Minutes" value={minutes} onChangeText={setMinutes} inputMode="numeric" keyboardType="number-pad" maxLength={3} />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Price (£)" value={price} onChangeText={setPrice} inputMode="decimal" keyboardType="decimal-pad" placeholder="48" />
          </View>
        </View>
        {error ? <Banner tone="error">{error}</Banner> : null}
      </View>
    </AppShell>
  );
}
