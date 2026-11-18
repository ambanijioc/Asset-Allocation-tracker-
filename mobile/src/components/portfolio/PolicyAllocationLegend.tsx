import { StyleSheet, Text, View } from 'react-native';

import { Badge, type BadgeTone } from '@/src/components/ui/Badge';
import type {
  PolicyEvaluation,
  PolicySleeveEvaluation,
  PolicyStatus,
} from '@/src/features/portfolio/policy';
import { formatDriftPp, formatPercent } from '@/src/lib/format/money';
import { numeric, radius, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

interface PolicyAllocationLegendProps {
  evaluation: PolicyEvaluation;
}

function badgeTone(
  status: PolicyStatus,
  actionable: boolean,
): BadgeTone {
  if (!actionable) return 'neutral';
  if (status === 'within') return 'positive';
  if (status === 'watch') return 'warning';
  return 'negative';
}

function SleeveRow({
  sleeve,
  actionable,
}: {
  sleeve: PolicySleeveEvaluation;
  actionable: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: sleeve.color }]} />
      <View style={styles.text}>
        <View style={styles.topLine}>
          <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
            {sleeve.label}
          </Text>
          <Text style={[styles.current, numeric, { color: colors.text }]}>
            {formatPercent(sleeve.currentPercentage)}
          </Text>
        </View>
        <View style={styles.bottomLine}>
          <Text style={[styles.target, { color: colors.muted }]} numberOfLines={1}>
            Target {formatPercent(sleeve.targetPercentage)} · ±{sleeve.bandPp} pp
          </Text>
          <Badge
            label={formatDriftPp(sleeve.driftPp, { signed: true })}
            tone={badgeTone(sleeve.status, actionable)}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * Dashboard legend for policy sleeves. It deliberately shows drift next to
 * every sleeve's tolerance instead of a single portfolio-wide threshold.
 */
export function PolicyAllocationLegend({ evaluation }: PolicyAllocationLegendProps) {
  const { colors } = useTheme();
  const actionable = !evaluation.isTemplate && evaluation.isValid;
  const hasCoverageGap = evaluation.unmanaged.length > 0;

  return (
    <View style={styles.legend}>
      {evaluation.sleeves.map((sleeve) => (
        <SleeveRow key={sleeve.path} sleeve={sleeve} actionable={actionable} />
      ))}

      {hasCoverageGap ? (
        <View style={[styles.unmanaged, { borderTopColor: colors.border }]}>
          <View style={[styles.dot, { backgroundColor: colors.muted }]} />
          <View style={styles.text}>
            <View style={styles.topLine}>
              <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
                Outside policy ({evaluation.unmanaged.length})
              </Text>
              <Text style={[styles.current, numeric, { color: colors.textSecondary }]}>
                {formatPercent(evaluation.unmanagedPercentage)}
              </Text>
            </View>
            <View style={styles.bottomLine}>
              <Text style={[styles.target, { color: colors.muted }]} numberOfLines={1}>
                No sleeve target
              </Text>
              <Badge label="Unmanaged" tone="warning" />
            </View>
          </View>
        </View>
      ) : null}

      <Text style={[styles.coverage, { color: colors.muted }]}>
        {formatPercent(evaluation.managedPercentage)} of value covered by policy
        {hasCoverageGap ? ` · ${formatPercent(evaluation.unmanagedPercentage)} outside` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  unmanaged: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.md,
  },
  dot: { width: 8, height: 8, borderRadius: radius.full, marginTop: 5 },
  text: { flex: 1, gap: 3 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bottomLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { ...type.bodyMedium, flex: 1 },
  current: { fontSize: 13, fontWeight: '600' },
  target: { ...type.caption, flex: 1 },
  coverage: { ...type.caption, paddingTop: space.xs },
});
