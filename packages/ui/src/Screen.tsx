import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from './theme';

/** Page wrapper: centred column, max width on web, safe padding. */
export function Screen({ children, maxWidth = 720 }: PropsWithChildren<{ maxWidth?: number }>) {
  const t = useTheme();
  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.scroll}>
      <View style={[styles.column, { maxWidth }]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center', padding: 16 },
  column: { width: '100%' },
});
