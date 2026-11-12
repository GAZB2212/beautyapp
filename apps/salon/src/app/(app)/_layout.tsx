import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Button, Container, Text } from '@salon/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { CurrentSalonProvider, useMemberships } from '@/features/salon/CurrentSalon';

const Loading = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator color="#9A8F86" />
  </View>
);

/** The signed-in dashboard. Requires a session and at least one salon. */
export default function AppLayout() {
  const { session, recovering, signOut } = useAuth();
  const memberships = useMemberships(session?.user.id);

  if (session === undefined) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  if (recovering) return <Redirect href="/reset-password" />;
  // Wait for a fresh answer before deciding someone has no salon.
  if (memberships.isPending || (memberships.isFetching && memberships.data?.length === 0)) return <Loading />;
  if (memberships.isError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Container style={{ alignItems: 'center', gap: 14 }}>
          <Text center tone="muted">
            We couldn’t load your salon. Please check your connection.
          </Text>
          <Button title="Try again" variant="outline" onPress={() => memberships.refetch()} style={{ alignSelf: 'center' }} />
          <Button title="Sign out" variant="quiet" onPress={signOut} style={{ alignSelf: 'center' }} />
        </Container>
      </View>
    );
  }
  const current = memberships.data[0];
  if (!current) return <Redirect href="/welcome" />;

  return (
    <CurrentSalonProvider value={current}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </CurrentSalonProvider>
  );
}
