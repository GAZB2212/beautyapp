import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { errorCode, setSalonPublished } from '@salon/api';
import { Banner, Button, Card, Check, Chevron, Divider, Text, useTheme } from '@salon/ui';
import { AppShell } from '@/features/salon/AppShell';
import { useCurrentSalon, useRefreshMemberships } from '@/features/salon/CurrentSalon';
import { useSetup } from '@/features/salon/setup';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

const PUBLISH_MESSAGES: Record<string, string> = {
  needs_opening_hours: 'Add your opening hours before going live.',
  needs_bookable_service: 'Add at least one service, and a stylist who offers it, before going live.',
  not_allowed: 'Only the salon’s owner can put it live or take it offline.',
  salon_suspended: 'This salon is suspended. Please contact support.',
};

/** Dashboard home. Until the diary arrives, this is the getting-started checklist. */
export default function Home() {
  const { salon, role } = useCurrentSalon();
  const { colors } = useTheme();
  const router = useRouter();
  const setup = useSetup(salon.id);
  const refreshSalon = useRefreshMemberships();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const live = salon.status === 'active';
  const link = `${env.bookingOrigin}/${salon.slug}`;
  const s = setup.data;
  const steps: { title: string; done: boolean; detail: string; href: Href }[] = [
    {
      title: 'Opening hours',
      done: !!s && s.hours.length > 0,
      detail: s && s.hours.length > 0 ? `Open ${new Set(s.hours.map((h) => h.weekday)).size} days a week` : 'When can clients book?',
      href: '/setup/hours',
    },
    {
      title: 'Your first stylist',
      done: !!s && s.staff.length > 0,
      detail: s && s.staff.length > 0 ? s.staff.map((m) => m.name).join(', ') : 'Who takes appointments? This can be you.',
      href: '/setup/stylist',
    },
    {
      title: 'Your first service',
      done: !!s && s.services.length > 0 && s.links > 0,
      detail: s && s.services.length > 0 ? s.services.map((v) => v.name).join(', ') : 'What can clients book?',
      href: '/setup/service',
    },
  ];
  const ready = steps.every((x) => x.done);

  const publish = async (next: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await setSalonPublished(supabase(), salon.id, next);
      await refreshSalon();
    } catch (e) {
      setError(PUBLISH_MESSAGES[errorCode(e)] ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title={live ? 'You’re live' : 'Let’s get you set up'} eyebrow={live ? 'Taking bookings' : 'Getting started'}>
      {setup.isPending ? (
        <ActivityIndicator color={colors.muted} style={{ marginTop: 24 }} />
      ) : setup.isError ? (
        <View style={{ gap: 12 }}>
          <Banner tone="error">We couldn’t load your salon’s details.</Banner>
          <Button title="Try again" variant="outline" onPress={() => setup.refetch()} />
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          <Text tone="muted">
            {live
              ? 'Clients can book you online. Share your link anywhere: Instagram, Google, WhatsApp.'
              : 'Three short steps, then your booking page can go live. You can change everything later.'}
          </Text>

          <Card style={{ paddingVertical: 4 }}>
            {steps.map((step, i) => (
              <View key={step.title}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${step.title}, ${step.done ? 'done' : 'to do'}`}
                  onPress={() => router.push(step.href)}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, opacity: pressed ? 0.6 : 1 })}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: step.done ? colors.ink : colors.line,
                      backgroundColor: step.done ? colors.ink : colors.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {step.done ? <Check size={11} color={colors.onInk} /> : <Text variant="small">{i + 1}</Text>}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="subheading">{step.title}</Text>
                    <Text variant="small" numberOfLines={2}>
                      {step.detail}
                    </Text>
                  </View>
                  <Chevron size={8} color={colors.muted} />
                </Pressable>
              </View>
            ))}
          </Card>

          <Card style={{ gap: 10, backgroundColor: colors.surface, borderColor: colors.surface }}>
            <Text variant="label" tone="muted">
              Your booking link
            </Text>
            <Text variant="subheading" selectable>
              {link.replace(/^https?:\/\//, '')}
            </Text>
            <Text variant="small">
              {live ? 'Live now. Anyone with this link can book.' : 'Private until you go live. Only your team can preview it.'}
            </Text>
          </Card>

          {error ? <Banner tone="error">{error}</Banner> : null}

          {role === 'owner' ? (
            live ? (
              <Button title={busy ? 'Working…' : 'Take offline'} variant="outline" block disabled={busy} onPress={() => publish(false)} />
            ) : (
              <Button title={busy ? 'Going live…' : 'Go live'} size="lg" block disabled={busy || !ready} onPress={() => publish(true)} />
            )
          ) : (
            <Text variant="small" center>
              Only the salon’s owner can put the booking page live.
            </Text>
          )}
        </View>
      )}
    </AppShell>
  );
}
