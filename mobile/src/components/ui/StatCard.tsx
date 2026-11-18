import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { numeric, radius, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

import { Badge, type BadgeTone } from './Badge';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: ComponentProps<typeof Feather>['name'];
  tone?: 'neutral' | 'positive' | 'negative';
  badgeLabel?: string;
  badgeTone?: BadgeTone;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  badgeLabel,
  badgeTone,
  onPress,
  accessibilityLabel,
}: StatCardProps) {
  const { colors } = useTheme();
  const valueColor =
    tone === 'positive' ? colors.positive : tone === 'negative' ? colors.negative : colors.text;

  return (
    <Card style={styles.card} onPress={onPress} accessibilityLabel={accessibilityLabel ?? label}>
      <View style={styles.topRow}>
        <Text style={[type.label, { color: colors.muted, flex: 1 }]} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.iconBubble, { backgroundColor: colors.accentSoft }]}>
          <Feather name={icon} size={13} color={colors.accent} />
        </View>
      </View>

      <Text
        style={[styles.value, numeric, { color: valueColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        maxFontSizeMultiplier={1.3}
      >
        {value}
      </Text>

      <View style={styles.footer}>
        {badgeLabel ? <Badge label={badgeLabel} tone={badgeTone} /> : null}
        {hint ? (
          <Text
            style={[styles.hint, { color: colors.muted }]}
            numberOfLines={1}
          >
            {hint}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: space.md,
    minHeight: 118,
    justifyContent: 'space-between',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconBubble: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 21, fontWeight: '600', letterSpacing: -0.4, marginVertical: space.sm },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  hint: { fontSize: 11, flexShrink: 1 },
});
