import { View } from 'react-native';
import { Container, Divider, Text, useTheme } from '@salon/ui';

/** Root of the booking domain. In production this becomes a short landing page for salons. */
export default function Home() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
      <Container style={{ alignItems: 'center', gap: 14 }}>
        <Text variant="label" tone="muted">
          Online booking for independent salons
        </Text>
        <Text variant="display" center accessibilityRole="header">
          Salon App
        </Text>
        <Divider short />
        <Text center tone="muted" style={{ maxWidth: 420 }}>
          Every salon has its own page. Follow the link or scan the code your salon gave you.
        </Text>
      </Container>
    </View>
  );
}
