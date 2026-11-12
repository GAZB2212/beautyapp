import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Divider, Text, useTheme } from '@salon/ui';

/** Centred, calm frame for sign-in, sign-up and other single-purpose screens. */
export function AuthShell({ title, intro, footer, children }: PropsWithChildren<{ title: string; intro?: string; footer?: ReactNode }>) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
            <View style={{ alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <Text variant="label" tone="muted">
                Salon App
              </Text>
              <Text variant="title" center accessibilityRole="header">
                {title}
              </Text>
              <Divider short />
              {intro ? (
                <Text center tone="muted">
                  {intro}
                </Text>
              ) : null}
            </View>
            <View style={{ gap: 18 }}>{children}</View>
            {footer ? <View style={{ alignItems: 'center', gap: 12, marginTop: 28 }}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
