import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  trailing?: ReactNode;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction, trailing }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={styles.text}>
        <Text style={[type.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
        >
          <Text style={[styles.action, { color: colors.accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
    gap: space.md,
  },
  text: { flex: 1 },
  action: { fontSize: 13, fontWeight: '600' },
});
