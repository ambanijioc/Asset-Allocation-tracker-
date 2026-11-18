import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, space } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

export type BannerTone = 'info' | 'warning' | 'error';

interface BannerProps {
  message: string;
  tone?: BannerTone;
  icon?: ComponentProps<typeof Feather>['name'];
  actionLabel?: string;
  onAction?: () => void;
}

export function Banner({ message, tone = 'info', icon, actionLabel, onAction }: BannerProps) {
  const { colors } = useTheme();

  const tones: Record<BannerTone, { fg: string; bg: string; border: string }> = {
    info: { fg: colors.accent, bg: colors.accentSoft, border: 'transparent' },
    warning: { fg: colors.warning, bg: colors.warningSoft, border: 'transparent' },
    error: { fg: colors.negative, bg: colors.negativeSoft, border: 'transparent' },
  };
  const palette = tones[tone];

  return (
    <View
      style={[styles.wrapper, { backgroundColor: palette.bg, borderColor: palette.border }]}
      accessibilityRole="alert"
    >
      <Feather name={icon ?? 'info'} size={15} color={palette.fg} />
      <Text style={[styles.message, { color: palette.fg }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.action, { color: palette.fg }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  message: { flex: 1, fontSize: 12, lineHeight: 17 },
  action: { fontSize: 12, fontWeight: '700' },
});
