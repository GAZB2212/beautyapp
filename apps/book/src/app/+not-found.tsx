import { Link } from 'expo-router';
import { View } from 'react-native';
import { Container, Divider, Text, useTheme } from '@salon/ui';

export default function NotFound() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
      <Container style={{ alignItems: 'center', gap: 14 }}>
        <Text variant="title" center>
          Page not found
        </Text>
        <Divider short />
        <Link href="/">
          <Text variant="label" tone="muted">
            Back to home
          </Text>
        </Link>
      </Container>
    </View>
  );
}
