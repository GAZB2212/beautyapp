import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/features/auth/AuthProvider';

/** Sign-in and sign-up screens. Anyone already signed in is sent to the dashboard. */
export default function AuthLayout() {
  const { session, recovering } = useAuth();
  if (session === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#9A8F86" />
      </View>
    );
  }
  if (session && recovering) return <Redirect href="/reset-password" />;
  if (session) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
