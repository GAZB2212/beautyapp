import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  addDays,
  dateKeyOf,
  dayChipParts,
  formatDayLong,
  formatTime,
  hourOf,
  todayKey,
  type AvailabilitySlot,
} from '@salon/core';
import { Button, Text, useTheme } from '@salon/ui';
import { BookingShell } from '@/features/booking/BookingShell';
import { useBooking } from '@/features/booking/useBooking';
import { fetchAvailability } from '@/lib/data';

const PAGE_DAYS = 14;

/** Step 3: choose a day and time. */
export default function ChooseTime() {
  const { salon, slug, service, stylist, anyStylist, showStylistStep, stepLabel } = useBooking();
  const { colors, radius } = useTheme();
  const router = useRouter();
  const tz = salon.salon.timezone;

  const today = todayKey(tz);
  const lastDay = addDays(today, salon.booking_rules.max_advance_days);
  const [from, setFrom] = useState(today);
  const [chosenDay, setDay] = useState<string | null>(null);
  const day = chosenDay;
  const [picked, setPicked] = useState<AvailabilitySlot | null>(null);

  const staffId = stylist?.id;
  const query = useQuery({
    queryKey: ['availability', slug, service?.id, staffId ?? 'any', from],
    queryFn: () => fetchAvailability({ slug, serviceId: service!.id, from, days: PAGE_DAYS, staffId }),
    enabled: !!service && (!!stylist || anyStylist),
    staleTime: 30_000,
  });

  // One entry per start time per day. With "any stylist", the first free stylist takes it.
  const byDay = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    for (const slot of query.data ?? []) {
      const key = dateKeyOf(slot.starts_at, tz);
      const list = map.get(key) ?? [];
      if (!list.some((s) => s.starts_at === slot.starts_at)) list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [query.data, tz]);

  const days = useMemo(
    () => Array.from({ length: PAGE_DAYS }, (_, i) => addDays(from, i)).filter((d) => d <= lastDay),
    [from, lastDay],
  );

  // The day shown: the one the client tapped, otherwise the first day with a free time.
  const activeDay = day && days.includes(day) && byDay.has(day) ? day : (days.find((d) => byDay.has(d)) ?? null);

  if (!service) return <Redirect href={{ pathname: '/[slug]/book', params: { slug } }} />;
  if (!stylist && !anyStylist) {
    return <Redirect href={{ pathname: '/[slug]/book/stylist', params: { slug, service: service.id } }} />;
  }

  const slots = activeDay ? (byDay.get(activeDay) ?? []) : [];
  const groups = [
    { name: 'Morning', slots: slots.filter((s) => hourOf(s.starts_at, tz) < 12) },
    { name: 'Afternoon', slots: slots.filter((s) => hourOf(s.starts_at, tz) >= 12 && hourOf(s.starts_at, tz) < 17) },
    { name: 'Evening', slots: slots.filter((s) => hourOf(s.starts_at, tz) >= 17) },
  ].filter((g) => g.slots.length > 0);

  const hasEarlier = from > today;
  const hasLater = addDays(from, PAGE_DAYS) <= lastDay;
  const move = (delta: number) => {
    setFrom(delta < 0 && addDays(from, delta) < today ? today : addDays(from, delta));
    setDay(null);
    setPicked(null);
  };

  const fallback = showStylistStep
    ? ({ pathname: '/[slug]/book/stylist', params: { slug, service: service.id } } as const)
    : ({ pathname: '/[slug]/book', params: { slug } } as const);

  return (
    <BookingShell
      title="Choose a time"
      step={stepLabel('time')}
      fallback={fallback}
      footer={
        <Button
          block
          size="lg"
          disabled={!picked}
          title={picked ? `Continue · ${formatTime(picked.starts_at, tz)}` : 'Choose a time'}
          onPress={() =>
            picked &&
            router.push({
              pathname: '/[slug]/book/details',
              params: { slug, service: service.id, staff: picked.staff_id, start: picked.starts_at, ...(anyStylist ? { any: '1' } : {}) },
            })
          }
        />
      }
    >
      <Text tone="muted" style={{ marginBottom: 20 }}>
        {service.name} with {stylist ? stylist.name : 'any stylist'}
      </Text>

      {/* Day strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24 }} contentContainerStyle={styles.strip}>
        {days.map((d) => {
          const parts = dayChipParts(d);
          const free = byDay.has(d);
          const selected = d === activeDay;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={`${formatDayLong(d)}${free ? '' : ', no times available'}`}
              accessibilityState={{ selected, disabled: !free }}
              disabled={!free}
              onPress={() => {
                setDay(d);
                setPicked(null);
              }}
              style={[
                styles.day,
                {
                  borderRadius: radius.md,
                  borderColor: selected ? colors.ink : colors.line,
                  backgroundColor: selected ? colors.ink : colors.background,
                  opacity: free ? 1 : 0.38,
                },
              ]}
            >
              <Text variant="label" tone={selected ? 'onInk' : 'muted'} style={{ fontSize: 10, letterSpacing: 1.4 }}>
                {parts.weekday}
              </Text>
              <Text variant="heading" tone={selected ? 'onInk' : 'ink'} style={{ fontSize: 24, lineHeight: 28 }}>
                {parts.day}
              </Text>
              <Text variant="small" tone={selected ? 'onInk' : 'muted'} style={{ fontSize: 12, lineHeight: 14 }}>
                {parts.month}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.pager}>
        {hasEarlier ? (
          <Pressable accessibilityRole="button" onPress={() => move(-PAGE_DAYS)} hitSlop={10}>
            <Text variant="label" tone="muted">
              Earlier dates
            </Text>
          </Pressable>
        ) : (
          <View />
        )}
        {hasLater ? (
          <Pressable accessibilityRole="button" onPress={() => move(PAGE_DAYS)} hitSlop={10}>
            <Text variant="label" tone="muted">
              Later dates
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Times */}
      {query.isPending ? (
        <ActivityIndicator color={colors.muted} style={{ marginTop: 40 }} />
      ) : query.isError ? (
        <View style={{ alignItems: 'center', gap: 14, marginTop: 32 }}>
          <Text center tone="muted">
            We couldn’t load the diary. Please check your connection.
          </Text>
          <Button title="Try again" variant="outline" onPress={() => query.refetch()} style={{ alignSelf: 'center' }} />
        </View>
      ) : !activeDay ? (
        <View style={{ alignItems: 'center', gap: 14, marginTop: 32 }}>
          <Text center tone="muted">
            No times are free in these two weeks.
          </Text>
          {hasLater ? <Button title="See later dates" variant="outline" onPress={() => move(PAGE_DAYS)} style={{ alignSelf: 'center' }} /> : null}
        </View>
      ) : (
        <View style={{ marginTop: 8 }}>
          <Text variant="heading" style={{ fontSize: 22, lineHeight: 28, marginBottom: 8 }}>
            {formatDayLong(activeDay)}
          </Text>
          {groups.map((g) => (
            <View key={g.name} style={{ marginTop: 16 }}>
              <Text variant="label" tone="muted" style={{ marginBottom: 10 }}>
                {g.name}
              </Text>
              <View style={styles.grid}>
                {g.slots.map((s) => {
                  const selected = picked?.starts_at === s.starts_at;
                  return (
                    <Pressable
                      key={s.starts_at}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setPicked(s)}
                      style={[
                        styles.time,
                        {
                          borderRadius: radius.pill,
                          borderColor: selected ? colors.ink : colors.line,
                          backgroundColor: selected ? colors.ink : colors.background,
                        },
                      ]}
                    >
                      <Text variant="subheading" tone={selected ? 'onInk' : 'ink'} style={{ fontSize: 15 }}>
                        {formatTime(s.starts_at, tz)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </BookingShell>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: 24, gap: 8 },
  day: { width: 58, paddingVertical: 10, alignItems: 'center', borderWidth: 1, gap: 2 },
  pager: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 12, minHeight: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  time: { minWidth: 98, flexGrow: 1, flexBasis: '30%', maxWidth: '32%', height: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
