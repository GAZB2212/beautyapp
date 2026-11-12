import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, Container, Divider, Monogram, SectionHeading, Text, useTheme } from '@salon/ui';
import { Cover } from './Cover';
import { formatDuration, formatPrice } from './format';
import type { Storefront, StorefrontService } from './types';

type Props = { salon: Storefront; onBook: (serviceId?: string) => void };

/** "Classic" layout: centred, serif-led, photography first. One of three storefront layouts. */
export function StorefrontClassic({ salon, onBook }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 720;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Cover name={salon.name} coverUrl={salon.branding.coverUrl} height={wide ? 340 : 230} />

        {/* Identity */}
        <Container style={{ alignItems: 'center', marginTop: wide ? 8 : 4, gap: 14 }}>
          {salon.city ? (
            <Text variant="label" tone="muted">
              {salon.city}
            </Text>
          ) : null}
          <Text variant="display" center accessibilityRole="header" style={wide ? { fontSize: 68, lineHeight: 72 } : undefined}>
            {salon.name}
          </Text>
          {salon.tagline ? (
            <Text variant="heading" italic center tone="muted" style={{ fontSize: 21, lineHeight: 27, maxWidth: 420 }}>
              {salon.tagline}
            </Text>
          ) : null}
          <Divider short style={{ marginVertical: 8 }} />
          {salon.about ? (
            <Text center tone="muted" style={{ maxWidth: 520 }}>
              {salon.about}
            </Text>
          ) : null}
          {wide ? <Button title="Book an appointment" size="lg" onPress={() => onBook()} style={{ alignSelf: 'center', marginTop: 12 }} /> : null}
        </Container>

        {/* Services */}
        <Container style={{ marginTop: 64 }}>
          <SectionHeading eyebrow="Services" title="The menu" />
          {salon.categories.map((cat) => (
            <View key={cat.name} style={{ marginBottom: 28 }}>
              <View style={styles.category}>
                <Text variant="label">{cat.name}</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.accent, opacity: 0.6 }} />
              </View>
              {cat.services.map((s, i) => (
                <ServiceRow key={s.id} service={s} first={i === 0} onPress={() => onBook(s.id)} />
              ))}
            </View>
          ))}
        </Container>

        {/* Team */}
        <View style={{ backgroundColor: colors.surface, paddingVertical: 56, marginTop: 28 }}>
          <Container>
            <SectionHeading eyebrow="The team" title="Your stylists" />
            <View style={styles.team}>
              {salon.team.map((m) => (
                <View key={m.id} style={styles.member}>
                  <Monogram name={m.name} size={84} />
                  <Text variant="subheading" center style={{ marginTop: 12 }}>
                    {m.name}
                  </Text>
                  {m.role ? (
                    <Text variant="small" center>
                      {m.role}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </Container>
        </View>

        {/* Visit */}
        <Container style={{ marginTop: 56 }}>
          <SectionHeading eyebrow="Visit" title="Opening hours" />
          <View style={{ alignSelf: 'center', width: '100%', maxWidth: 360 }}>
            {salon.hours.map((h) => (
              <View key={h.day} style={styles.hoursRow}>
                <Text tone={h.open ? 'ink' : 'muted'}>{h.day}</Text>
                <Text tone={h.open ? 'ink' : 'muted'}>{h.open ? `${h.open} – ${h.close}` : 'Closed'}</Text>
              </View>
            ))}
          </View>
          <Divider style={{ marginVertical: 36 }} />
          <View style={{ alignItems: 'center', gap: 6 }}>
            {salon.addressLine ? <Text center>{salon.addressLine}</Text> : null}
            {salon.phone ? <Text center tone="muted">{salon.phone}</Text> : null}
            {salon.instagram ? <Text center tone="muted">@{salon.instagram}</Text> : null}
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

function ServiceRow({ service, first, onPress }: { service: StorefrontService; first: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Book ${service.name}, ${formatDuration(service.durationMin)}, ${formatPrice(service.pricePence, service.priceIsFrom)}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.service,
        { borderTopColor: colors.line, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth * 2, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <Text variant="subheading" style={{ fontSize: 17 }}>
          {service.name}
        </Text>
        {service.description ? <Text variant="small">{service.description}</Text> : null}
        <Chip label={formatDuration(service.durationMin)} />
      </View>
      <Text variant="subheading" style={{ fontSize: 17, marginLeft: 16 }}>
        {formatPrice(service.pricePence, service.priceIsFrom)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  category: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 2 },
  team: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 28, rowGap: 28 },
  member: { width: 150, alignItems: 'center' },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  service: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 18 },
  bar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth * 2 },
});
