import { Link } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from '@salon/ui';

export default function NotFound() {
  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Page not found</Text>
      <Link href="/">Go home</Link>
    </Screen>
  );
}
