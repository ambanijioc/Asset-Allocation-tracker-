import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { numeric, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

interface ScreenHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  /** Optional right-aligned control (icon button, avatar…). */
  action?: ReactNode;
  /** Optional left-aligned control, used for back navigation on stack screens. */
  leading?: ReactNode;
  /** Dashboard variant with a larger greeting. */
  size?: 'default' | 'large';
}

export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  action,
  leading,
  size = 'default',
}: ScreenHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.textColumn}>
        {eyebrow ? (
          <Text style={[type.label, { color: colors.muted }]} numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}
        <Text
          accessibilityRole="header"
          style={[
            size === 'large' ? type.display : { fontSize: 24, fontWeight: '600' as const, letterSpacing: -0.4 },
            numeric,
            { color: colors.text, marginTop: eyebrow ? space.xs : 0 },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.caption, { color: colors.muted, marginTop: space.xs }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: space.md,
    marginBottom: space.xl,
    gap: space.md,
  },
  textColumn: { flex: 1 },
  leading: { paddingTop: space.xs },
  action: { paddingTop: space.xs },
});
