import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Screen } from '@/src/components/ui/Screen';
import { space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

export default function NotFoundScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Screen>
      <Card style={styles.card}>
        <Text style={[styles.code, { color: colors.border }]}>404</Text>
        <Text style={[type.title, { color: colors.text }]}>Page not found</Text>
        <Text style={[type.body, styles.message, { color: colors.muted }]}>
          The screen you were looking for does not exist or has moved.
        </Text>
        <Button label="Go to dashboard" onPress={() => router.replace('/')} variant="secondary" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.xxxl, alignItems: 'center', gap: space.sm },
  code: { fontSize: 56, fontWeight: '700', letterSpacing: -2 },
  message: { textAlign: 'center', lineHeight: 20, marginBottom: space.md },
});
