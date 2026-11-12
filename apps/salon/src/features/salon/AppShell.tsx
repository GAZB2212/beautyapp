import { useRouter, type Href } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chevron, Text, useTheme } from '@salon/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCurrentSalon } from './CurrentSalon';

type Props = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  /** Show a back arrow to this route instead of the sign-out link */
  back?: Href;
  footer?: ReactNode;
}>;

/** Frame for signed-in dashboard pages: salon name, sign out or back, a title, and content. */
export function AppShell({ title, eyebrow, back, footer, children }: Props) {
  const { colors } = useTheme();
  const { salon } = useCurrentSalon();
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.bar, { borderBottomColor: colors.line }]}>
          <View style={styles.side}>
            {back ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => router.replace(back)}>
                <Chevron direction="left" size={10} />
              </Pressable>
            ) : null}
          </View>
          <Text variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
            {salon.name}
          </Text>
          <View style={[styles.side, { alignItems: 'flex-end' }]}>
            {!back ? (
              <Pressable accessibilityRole="button" hitSlop={12} onPress={signOut}>
                <Text variant="label" tone="muted" style={{ fontSize: 10 }}>
                  Sign out
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={styles.column}>
            {eyebrow ? (
              <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>
                {eyebrow}
              </Text>
            ) : null}
            <Text variant="title" accessibilityRole="header" style={{ marginBottom: 20 }}>
              {title}
            </Text>
            {children}
          </View>
        </ScrollView>
        {footer ? (
          <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.line }]}>
            <View style={[styles.column, { paddingTop: 0 }]}>{footer}</View>
          </SafeAreaView>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  side: { width: 72, justifyContent: 'center' },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 28 },
  footer: { paddingTop: 12, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth * 2 },
});
