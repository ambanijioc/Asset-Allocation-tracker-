import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

import { Button } from './Button';

interface StateProps {
  icon: ComponentProps<typeof Feather>['name'];
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

function State({ icon, title, message, actionLabel, onAction }: StateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper} accessibilityRole="summary">
      <View style={[styles.iconCircle, { backgroundColor: colors.cardMuted }]}>
        <Feather name={icon} size={22} color={colors.muted} />
      </View>
      <Text style={[type.title, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.body, { color: colors.muted, textAlign: 'center', lineHeight: 20 }]}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" style={styles.action} />
      ) : null}
    </View>
  );
}

export function EmptyState(props: StateProps) {
  return <State {...props} />;
}

export function ErrorState({
  title = 'Could not load data',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <State
      icon="wifi-off"
      title={title}
      message={message}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xxxl,
    paddingHorizontal: space.xl,
    gap: space.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  action: { marginTop: space.md },
});
