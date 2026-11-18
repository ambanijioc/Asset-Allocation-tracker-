import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { radius, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

export interface AnalyticsCardProps {
  icon: ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  trailing?: ReactNode;
  /** Icon tint. Defaults to the theme accent. */
  tint?: string;
  tintSoft?: string;
}

/**
 * Shared shell for analytics panels. Mirrors the web dashboard's icon-bubble
 * card headers while staying inside the mobile token system.
 */
export function AnalyticsCard({
  icon,
  title,
  subtitle,
  children,
  footer,
  trailing,
  tint,
  tintSoft,
}: AnalyticsCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View
          style={[
            styles.iconBubble,
            { backgroundColor: tintSoft ?? colors.accentSoft },
          ]}
        >
          <Feather name={icon} size={15} color={tint ?? colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
          ) : null}
        </View>
        {trailing}
      </View>

      {children}

      {footer ? (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>{footer}</View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', letterSpacing: -0.1 },
  subtitle: { ...type.caption, marginTop: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md },
});
