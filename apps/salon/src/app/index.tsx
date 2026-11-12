import { View } from 'react-native';
import { Container, Divider, Text, useTheme } from '@salon/ui';

/** Dashboard entry. Sign-in and the onboarding wizard arrive in step 2, the diary in step 6. */
export default function DashboardHome() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
      <Container style={{ alignItems: 'center', gap: 14 }}>
        <Text variant="label" tone="muted">
          Dashboard
        </Text>
        <Text variant="display" center accessibilityRole="header">
          Salon App
        </Text>
        <Divider short />
        <Text center tone="muted">
          Sign in and salon setup are coming next.
        </Text>
      </Container>
    </View>
  );
}
