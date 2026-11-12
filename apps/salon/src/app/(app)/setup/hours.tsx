import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { toApiError } from '@salon/api';
import { Banner, Button, Checkbox, Text, TextField } from '@salon/ui';
import { AppShell } from '@/features/salon/AppShell';
import { useCurrentSalon } from '@/features/salon/CurrentSalon';
import { useRefreshSetup, useSetup } from '@/features/salon/setup';
import { supabase } from '@/lib/supabase';

const DAYS = [
  { weekday: 1, name: 'Monday' },
  { weekday: 2, name: 'Tuesday' },
  { weekday: 3, name: 'Wednesday' },
  { weekday: 4, name: 'Thursday' },
  { weekday: 5, name: 'Friday' },
  { weekday: 6, name: 'Saturday' },
  { weekday: 0, name: 'Sunday' },
];
type Row = { open: boolean; from: string; to: string };
const DEFAULT: Record<number, Row> = Object.fromEntries(
  DAYS.map((d) => [d.weekday, { open: d.weekday >= 2 && d.weekday <= 6, from: '09:00', to: '17:30' }]),
);
const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;
const pad = (t: string) => (t.length === 4 ? `0${t}` : t);

/** Weekly opening hours: one span per day (split days come with the full settings screen). */
export default function Hours() {
  const { salon } = useCurrentSalon();
  const router = useRouter();
  const setup = useSetup(salon.id);
  const refresh = useRefreshSetup(salon.id);
  const [rows, setRows] = useState<Record<number, Row>>(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from what is saved, once it has loaded.
  useEffect(() => {
    if (loaded || !setup.data) return;
    if (setup.data.hours.length > 0) {
      const next: Record<number, Row> = Object.fromEntries(DAYS.map((d) => [d.weekday, { open: false, from: '09:00', to: '17:30' }]));
      for (const h of setup.data.hours) next[h.weekday] = { open: true, from: h.opens_at.slice(0, 5), to: h.closes_at.slice(0, 5) };
      setRows(next); // eslint-disable-line react-hooks/set-state-in-effect -- one-off initialisation from loaded data
    }
    setLoaded(true);
  }, [setup.data, loaded]);

  const update = (weekday: number, patch: Partial<Row>) => setRows((r) => ({ ...r, [weekday]: { ...r[weekday]!, ...patch } }));

  const save = async () => {
    const open = DAYS.filter((d) => rows[d.weekday]!.open);
    if (open.length === 0) return setError('Please mark at least one day as open.');
    for (const d of open) {
      const r = rows[d.weekday]!;
      if (!TIME.test(r.from) || !TIME.test(r.to)) return setError(`Please enter ${d.name}’s times like 09:00 and 17:30.`);
      if (pad(r.to) <= pad(r.from)) return setError(`${d.name} needs to close after it opens.`);
    }
    setBusy(true);
    setError(null);
    try {
      const db = supabase();
      const removed = await db.from('salon_hours').delete().eq('salon_id', salon.id);
      if (removed.error) throw toApiError(removed.error);
      const added = await db
        .from('salon_hours')
        .insert(open.map((d) => ({ salon_id: salon.id, weekday: d.weekday, opens_at: pad(rows[d.weekday]!.from), closes_at: pad(rows[d.weekday]!.to) })));
      if (added.error) throw toApiError(added.error);
      await refresh();
      router.replace('/');
    } catch {
      setError('We couldn’t save your hours. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      title="Opening hours"
      eyebrow="Step 1 of 3"
      back="/"
      footer={<Button title={busy ? 'Saving…' : 'Save hours'} size="lg" block disabled={busy} onPress={save} />}
    >
      <Text tone="muted" style={{ marginBottom: 20 }}>
        Clients can only book inside these hours. Use the 24-hour clock, for example 09:00 to 17:30.
      </Text>
      <View style={{ gap: 14 }}>
        {DAYS.map((d) => {
          const r = rows[d.weekday]!;
          return (
            <View key={d.weekday} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50 }}>
              <View style={{ width: 132 }}>
                <Checkbox checked={r.open} onChange={(v) => update(d.weekday, { open: v })} label={d.name} />
              </View>
              {r.open ? (
                <>
                  <View style={{ flex: 1 }}>
                    <TextField label={`${d.name} opens`} hideLabel value={r.from} onChangeText={(v) => update(d.weekday, { from: v })} inputMode="numeric" maxLength={5} />
                  </View>
                  <Text tone="muted">to</Text>
                  <View style={{ flex: 1 }}>
                    <TextField label={`${d.name} closes`} hideLabel value={r.to} onChangeText={(v) => update(d.weekday, { to: v })} inputMode="numeric" maxLength={5} />
                  </View>
                </>
              ) : (
                <Text tone="muted">Closed</Text>
              )}
            </View>
          );
        })}
      </View>
      {error ? (
        <View style={{ marginTop: 20 }}>
          <Banner tone="error">{error}</Banner>
        </View>
      ) : null}
    </AppShell>
  );
}
