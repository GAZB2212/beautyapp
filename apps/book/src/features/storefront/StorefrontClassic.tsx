import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDuration, type Storefront } from '@salon/core';
import { Button, Chip, Container, Divider, Monogram, OptionRow, SectionHeading, Text, useTheme } from '@salon/ui';
import { mediaUrl } from '@/lib/data';
import { formatPrice, groupServices, hoursByDay } from '@/features/salon/present';
import { Cover } from './Cover';

type Props = { salon: Storefront; onBook: (serviceId?: string) => void };

/** "Classic" layout: centred, serif-led, photography first. One of three storefront layouts. */
export function StorefrontClassic({ salon, onBook }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const { salon: s, branding: b } = salon;
  const address = [s.address_line1, s.address_line2, [s.city, s.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Cover name={s.name} coverUrl={mediaUrl(b.cover_path)} height={wide ? 340 : 230} />

        {/* Identity */}
        <Container style={{ alignItems: 'center', marginTop: wide ? 8 : 4, gap: 14 }}>
          {s.city ? (
            <Text variant="label" tone="muted">
              {s.city}
            </Text>
          ) : null}
          <Text variant="display" center accessibilityRole="header" style={wide ? { fontSize: 68, lineHeight: 72 } : undefined}>
            {s.name}
          </Text>
          {b.tagline ? (
            <Text variant="heading" italic center tone="muted" style={{ fontSize: 21, lineHeight: 27, maxWidth: 420 }}>
              {b.tagline}
            </Text>
          ) : null}
          <Divider short style={{ marginVertical: 8 }} />
          {b.about ? (
            <Text center tone="muted" style={{ maxWidth: 520 }}>
              {b.about}
            </Text>
          ) : null}
          {wide ? (
            <Button title="Book an appointment" size="lg" onPress={() => onBook()} style={{ alignSelf: 'center', marginTop: 12 }} />
          ) : null}
        </Container>

        {/* Services */}
        <Container style={{ marginTop: 64 }}>
          <SectionHeading eyebrow="Services" title="The menu" />
          {groupServices(salon).map((group) => (
            <View key={group.name} style={{ marginBottom: 28 }}>
              <View style={styles.category}>
                <Text variant="label">{group.name}</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.accent, opacity: 0.6 }} />
              </View>
              {group.services.map((v, i) => (
                <OptionRow
                  key={v.id}
                  first={i === 0}
                  title={v.name}
                  subtitle={v.description}
                  meta={<Chip label={formatDuration(v.duration_min)} />}
                  trailing={formatPrice(v.price_pence, s.currency, v.price_is_from)}
                  accessibilityLabel={`Book ${v.name}, ${formatDuration(v.duration_min)}, ${formatPrice(v.price_pence, s.currency, v.price_is_from)}`}
                  onPress={() => onBook(v.id)}
                />
              ))}
            </View>
          ))}
        </Container>

        {/* Team */}
        {salon.staff.length > 0 ? (
          <View style={{ backgroundColor: colors.surface, paddingVertical: 56, marginTop: 28 }}>
            <Container>
              <SectionHeading eyebrow="The team" title={salon.staff.length === 1 ? 'Your stylist' : 'Your stylists'} />
              <View style={styles.team}>
                {salon.staff.map((m) => (
                  <View key={m.id} style={styles.member}>
                    <Monogram name={m.name} size={84} />
                    <Text variant="subheading" center style={{ marginTop: 12 }}>
                      {m.name}
                    </Text>
                    {m.title ? (
                      <Text variant="small" center>
                        {m.title}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </Container>
          </View>
        ) : null}

        {/* Visit */}
        <Container style={{ marginTop: 56 }}>
          <SectionHeading eyebrow="Visit" title="Opening hours" />
          <View style={{ alignSelf: 'center', width: '100%', maxWidth: 360 }}>
            {hoursByDay(salon).map((h) => (
              <View key={h.day} style={styles.hoursRow}>
                <Text tone={h.text ? 'ink' : 'muted'}>{h.day}</Text>
                <Text tone={h.text ? 'ink' : 'muted'}>{h.text ?? 'Closed'}</Text>
              </View>
            ))}
          </View>
          <Divider style={{ marginVertical: 36 }} />
          <View style={{ alignItems: 'center', gap: 6 }}>
            {address ? <Text center>{address}</Text> : null}
            {s.phone ? (
              <Text center tone="muted">
                {s.phone}
              </Text>
            ) : null}
            {b.instagram ? (
              <Text center tone="muted">
                @{b.instagram.replace(/^@/, '')}
              </Text>
            ) : null}
          </View>
        </Container>
      </ScrollView>

      {/* Sticky call to action on phones */}
      {!wide ? (
        <SafeAreaView edges={['bottom']} style={[styles.bar, { backgroundColor: colors.background, borderTopColor: colors.line }]}>
          <Button title="Book an appointment" size="lg" block onPress={() => onBook()} />
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  category: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 2 },
  team: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 28, rowGap: 28 },
  member: { width: 150, alignItems: 'center' },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  bar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth * 2 },
});
