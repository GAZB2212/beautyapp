import { useLocalSearchParams } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { Screen, Button, useTheme } from '@salon/ui';

/** Salon storefront placeholder: branded page + "Book now". Real data arrives in step 4. */
export default function SalonPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const t = useTheme();
  return (
    <Screen>
      <Text style={[styles.title, { color: t.text }]}>{slug}</Text>
      <Text style={{ color: t.muted, marginBottom: 16 }}>Storefront for salon “{slug}”.</Text>
      <Button title="Book now" onPress={() => {}} />
    </Screen>
  );
}

const styles = StyleSheet.create({ title: { fontSize: 28, fontWeight: '700', marginBottom: 8 } });
