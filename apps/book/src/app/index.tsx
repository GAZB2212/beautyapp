import { Text, StyleSheet } from 'react-native';
import { Screen, useTheme } from '@salon/ui';

/** Root of the booking domain. In production this is a short landing page for salons. */
export default function Home() {
  const t = useTheme();
  return (
    <Screen>
      <Text style={[styles.title, { color: t.text }]}>Salon App</Text>
      <Text style={{ color: t.muted }}>
        Online booking for independent salons. Each salon has its own page at /its-name.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({ title: { fontSize: 28, fontWeight: '700', marginBottom: 8 } });
