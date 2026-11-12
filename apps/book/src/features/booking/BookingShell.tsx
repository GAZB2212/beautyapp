import { useRouter, type Href } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chevron, Container, Text, useTheme } from '@salon/ui';
import { useSalon } from '@/features/salon/SalonContext';

type Props = PropsWithChildren<{
  title: string;
  /** e.g. "Step 2 of 4" */
  step?: string;
  /** Where "back" goes when there is no history (the page was opened directly). */
  fallback: Href;
  /** Pinned to the bottom of the screen: the primary action for this step. */
  footer?: ReactNode;
}>;

/** Frame shared by every booking step: salon name, back, step label, title, pinned action. */
export function BookingShell({ title, step, fallback, footer, children }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const salon = useSalon();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(fallback));

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.bar, { borderBottomColor: colors.line }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={goBack} hitSlop={12} style={styles.back}>
            <Chevron direction="left" size={10} />
          </Pressable>
          <Text variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
            {salon.salon.name}
          </Text>
          <View style={styles.back} />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          <Container style={{ paddingTop: 28 }}>
            {step ? (
              <Text variant="label" tone="muted" style={{ marginBottom: 8 }}>
                {step}
              </Text>
            ) : null}
            <Text variant="title" accessibilityRole="header" style={{ marginBottom: 20 }}>
              {title}
            </Text>
            {children}
          </Container>
        </ScrollView>

        {footer ? (
          <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.line }]}>
            <Container style={{ paddingHorizontal: 20 }}>{footer}</Container>
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
  back: { width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' },
  footer: { paddingTop: 12, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth * 2 },
});
