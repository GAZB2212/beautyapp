import { Text, StyleSheet } from 'react-native';
import { Screen, useTheme } from '@salon/ui';

/** Dashboard entry. Auth + onboarding wizard arrive in step 2, diary in step 6. */
export default function DashboardHome() {
  const t = useTheme();
  return (
    <Screen maxWidth={1100}>
      <Text style={[styles.title, { color: t.text }]}>Salon App Dashboard</Text>
      <Text style={{ color: t.muted }}>Sign in and onboarding coming next.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({ title: { fontSize: 28, fontWeight: '700', marginBottom: 8 } });
