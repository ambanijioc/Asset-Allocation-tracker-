import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badge';
import { Card } from '@/src/components/ui/Card';
import { policyStatusView } from '@/src/components/portfolio/policyStatus';
import type {
  PolicyEvaluation,
  PolicyStatus,
} from '@/src/features/portfolio/policy';
import {
  formatCompactINR,
  formatDriftPp,
  formatPercent,
} from '@/src/lib/format/money';
import { numeric, radius, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

interface AllocationHealthCardProps {
  evaluation: PolicyEvaluation;
  policyVersion: number;
  readOnly?: boolean;
  onManageTargets: () => void;
  /** Opens the full rebalance planner when targets are usable. */
  onPlanRebalance?: () => void;
}

/**
 * The app's primary answer: how far is the portfolio from its target, and what
 * is the next rebalance action? Detail lives in the drift and tree cards below;
 * this card is deliberately scannable.
 */
export function AllocationHealthCard({
  evaluation,
  policyVersion,
  readOnly = false,
  onManageTargets,
  onPlanRebalance,
}: AllocationHealthCardProps) {
  const { colors } = useTheme();
  const {
    sleeves,
    breachCount,
    watchCount,
    withinCount,
    inToleranceCount,
    targetedCount,
    managedPercentage,
    isTemplate,
    isValid,
    targetSum,
  } = evaluation;

  const status = policyStatusView(evaluation);
  const needsTargets = isTemplate || !isValid || targetedCount === 0;
  const severity: PolicyStatus | 'unset' = needsTargets
    ? 'unset'
    : breachCount > 0
      ? 'breach'
      : watchCount > 0
        ? 'watch'
        : 'within';

  const tone =
    severity === 'unset'
      ? colors.muted
      : severity === 'within'
        ? colors.positive
        : severity === 'watch'
          ? colors.warning
          : colors.negative;
  const soft =
    severity === 'unset'
      ? colors.cardMuted
      : severity === 'within'
        ? colors.positiveSoft
        : severity === 'watch'
          ? colors.warningSoft
          : colors.negativeSoft;

  const headline = isTemplate
    ? readOnly
      ? 'This demo uses the default target template.'
      : 'Set your targets to turn allocation into a plan.'
    : targetedCount === 0
      ? 'No sleeve targets are set yet.'
      : !isValid
        ? `Targets total ${formatPercent(targetSum)} — they must total 100%.`
        : breachCount > 0
          ? `${breachCount} of ${targetedCount} sleeves outside their band.`
          : watchCount > 0
            ? `${watchCount} of ${targetedCount} sleeves nearing their band.`
            : 'Every sleeve is inside its band.';

  const breachUnderweight = sleeves
    .filter((sleeve) => sleeve.status === 'breach' && sleeve.driftPp < 0)
    .sort((a, b) => Math.abs(b.driftValue) - Math.abs(a.driftValue));
  const breachOverweight = sleeves
    .filter((sleeve) => sleeve.status === 'breach' && sleeve.driftPp > 0)
    .sort((a, b) => Math.abs(b.driftValue) - Math.abs(a.driftValue));
  const nextSleeve = breachUnderweight[0] ?? breachOverweight[0];
  const adding = Boolean(nextSleeve && nextSleeve.driftPp < 0);

  let nextAction = readOnly
    ? 'Targets are read-only in this demo.'
    : 'Set targets to unlock add and trim guidance.';
  let nextIcon: ComponentProps<typeof Feather>['name'] = readOnly ? 'lock' : 'target';
  if (!needsTargets) {
    if (nextSleeve) {
      nextAction = `${adding ? 'Add' : 'Trim'} ${formatCompactINR(
        Math.abs(nextSleeve.driftValue),
      )} ${adding ? 'to' : 'from'} ${nextSleeve.label}`;
      nextIcon = adding ? 'arrow-down-right' : 'arrow-up-right';
    } else if (watchCount > 0) {
      nextAction = `No rebalance needed — ${watchCount} sleeve${
        watchCount === 1 ? '' : 's'
      } nearing the band.`;
      nextIcon = 'clock';
    } else {
      nextAction = 'No action needed — every sleeve is inside its band.';
      nextIcon = 'check';
    }
  }

  const inToleranceTone = needsTargets
    ? colors.muted
    : inToleranceCount === 0
      ? colors.negative
      : inToleranceCount === targetedCount
        ? colors.positive
        : colors.warning;
  const outsideTone = needsTargets
    ? colors.muted
    : breachCount === 0
      ? colors.positive
      : colors.negative;
  const worstDriftTone = needsTargets
    ? colors.muted
    : breachCount > 0
      ? colors.negative
      : watchCount > 0
        ? colors.warning
        : colors.positive;
  const actionTone =
    needsTargets || !nextSleeve
      ? colors.textSecondary
      : adding
        ? colors.negative
        : colors.warning;
  const targetActionLabel = readOnly
    ? 'View targets'
    : isTemplate || targetedCount === 0
      ? 'Set targets'
      : !isValid
        ? 'Fix targets'
        : 'Manage targets';

  return (
    <Card style={styles.card}>
      <View style={styles.headerBlock}>
        <View style={styles.header}>
          <View style={[styles.icon, { backgroundColor: soft }]}>
            <Feather name={status.icon} size={17} color={tone} />
          </View>
          <Text style={[type.title, styles.headerTitle, { color: colors.text }]}>
            Allocation health
          </Text>
          <Badge label={status.badgeLabel} tone={status.badgeTone} />
        </View>
        <Text style={[styles.headline, { color: colors.textSecondary }]}>{headline}</Text>
      </View>

      <View style={styles.stats}>
        <HealthStat
          label="In tolerance"
          value={needsTargets ? '—' : `${inToleranceCount}/${targetedCount}`}
          tone={inToleranceTone}
          accessibilityLabel={
            needsTargets
              ? 'In tolerance unavailable until targets are set'
              : `${inToleranceCount} of ${targetedCount} sleeves in tolerance`
          }
        />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <HealthStat
          label="Outside band"
          value={needsTargets ? '—' : `${breachCount}`}
          tone={outsideTone}
          accessibilityLabel={
            needsTargets
              ? 'Outside band unavailable until targets are set'
              : `${breachCount} sleeves outside their band`
          }
        />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <HealthStat
          label="Worst drift"
          value={needsTargets ? '—' : formatDriftPp(evaluation.worstDriftPp)}
          tone={worstDriftTone}
          accessibilityLabel={
            needsTargets
              ? 'Worst drift unavailable until targets are set'
              : `Largest sleeve drift ${formatDriftPp(evaluation.worstDriftPp)}`
          }
        />
      </View>

      {!needsTargets && sleeves.length > 0 ? (
        <View
          style={styles.segments}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${withinCount} sleeves within band, ${watchCount} near band, ${breachCount} outside band`}
        >
          {sleeves.map((sleeve) => (
            <View
              key={sleeve.path}
              style={[
                styles.segment,
                {
                  backgroundColor:
                    sleeve.status === 'within'
                      ? colors.positive
                      : sleeve.status === 'watch'
                        ? colors.warning
                        : colors.negative,
                },
              ]}
            />
          ))}
        </View>
      ) : null}

      {onPlanRebalance && !needsTargets ? (
        <Pressable
          onPress={onPlanRebalance}
          accessibilityRole="button"
          accessibilityLabel={`Build rebalance plan. ${nextAction}`}
          style={({ pressed }) => [
            styles.nextAction,
            { backgroundColor: colors.cardMuted, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name={nextIcon} size={13} color={actionTone} />
          <Text style={[styles.nextActionText, { color: colors.textSecondary }]}>
            <Text style={[styles.nextActionLabel, { color: colors.text }]}>Next: </Text>
            {nextAction}
          </Text>
          <Feather name="chevron-right" size={14} color={colors.muted} />
        </Pressable>
      ) : (
        <View style={[styles.nextAction, { backgroundColor: colors.cardMuted }]}>
          <Feather name={nextIcon} size={13} color={actionTone} />
          <Text style={[styles.nextActionText, { color: colors.textSecondary }]}>
            <Text style={[styles.nextActionLabel, { color: colors.text }]}>Next: </Text>
            {nextAction}
          </Text>
        </View>
      )}

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.muted }]} numberOfLines={1}>
          {isTemplate
            ? 'Default target template'
            : targetedCount === 0
              ? 'No sleeve targets'
              : !isValid
                ? `Targets total ${formatPercent(targetSum)}`
                : `Policy v${policyVersion} · ${formatPercent(managedPercentage)} covered`}
        </Text>
        <Pressable
          onPress={onManageTargets}
          accessibilityRole="button"
          accessibilityLabel={`${targetActionLabel} for the allocation policy`}
          hitSlop={8}
        >
          <Text style={[styles.footerAction, { color: colors.accent }]}>
            {targetActionLabel}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

interface HealthStatProps {
  label: string;
  value: string;
  tone: string;
  accessibilityLabel: string;
}

function HealthStat({ label, value, tone, accessibilityLabel }: HealthStatProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.stat} accessible accessibilityLabel={accessibilityLabel}>
      <Text style={[styles.statLabel, { color: colors.muted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.statValue, numeric, { color: tone }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, paddingVertical: space.lg },
  headerBlock: { gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1 },
  headline: { fontSize: 12.5, lineHeight: 18, fontWeight: '500' },
  stats: { flexDirection: 'row', alignItems: 'stretch' },
  stat: { flex: 1, gap: 2, paddingHorizontal: space.xxs },
  statLabel: { ...type.label, fontSize: 9.5, letterSpacing: 0.35 },
  statValue: { fontSize: 18, fontWeight: '600', letterSpacing: -0.2 },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: 2 },
  segments: { flexDirection: 'row', gap: 3, height: 7, marginTop: space.xxs },
  segment: { flex: 1, borderRadius: radius.full },
  nextAction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  nextActionText: { flex: 1, fontSize: 11.5, lineHeight: 17 },
  nextActionLabel: { fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.sm,
  },
  footerText: { fontSize: 10.5, flexShrink: 1 },
  footerAction: { fontSize: 12, fontWeight: '600' },
});
