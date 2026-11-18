import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AllocationAnalysisCard } from '@/src/components/portfolio/insights/AllocationAnalysisCard';
import { policyStatusView } from '@/src/components/portfolio/policyStatus';
import { Badge } from '@/src/components/ui/Badge';
import { Banner } from '@/src/components/ui/Banner';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { IconButton } from '@/src/components/ui/IconButton';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/src/components/ui/States';
import type {
  PolicySleeveEvaluation,
  PolicyUnmanagedSlice,
} from '@/src/features/portfolio/policy';
import { usePortfolioData } from '@/src/features/portfolio/queries';
import {
  formatCompactINR,
  formatDriftPp,
  formatPercent,
} from '@/src/lib/format/money';
import { numeric, radius, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

export default function AllocationScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    summary,
    analytics,
    policyConfig,
    policyEvaluation,
    isDemo,
    isLoading,
    isRefreshing,
    error,
    refetch,
  } = usePortfolioData();

  const {
    sleeves,
    unmanaged,
    targetedCount,
    inToleranceCount,
    isTemplate,
    isValid,
    targetSum,
  } = policyEvaluation;
  const status = policyStatusView(policyEvaluation);
  const offPolicy = sleeves
    .filter((sleeve) => sleeve.status !== 'within')
    .sort((a, b) => Math.abs(b.driftPp) - Math.abs(a.driftPp));

  return (
    <Screen refreshing={isRefreshing} onRefresh={refetch}>
      <ScreenHeader
        eyebrow="Portfolio policy"
        title="Allocation"
        subtitle="Sleeve targets, tolerance bands and drift"
        action={
          <IconButton
            icon="refresh-cw"
            onPress={refetch}
            accessibilityLabel="Refresh allocation analysis"
          />
        }
      />

      <View style={styles.stack}>
        {isDemo ? (
          <Banner
            tone="info"
            icon="target"
            message="Demo data — targets use the default policy template and demo holdings."
          />
        ) : null}

        {!isDemo && isTemplate ? (
          <Banner
            tone="info"
            icon="target"
            message="No confirmed policy yet. Confirm targets to turn drift into an actionable exception."
            actionLabel="Set policy"
            onAction={() => router.push('/policy')}
          />
        ) : null}

        {!isTemplate && targetedCount === 0 ? (
          <Banner
            tone="warning"
            icon="target"
            message="No sleeve targets are set, so every holding sits outside policy. Assign targets to start monitoring drift."
            actionLabel="Set policy"
            onAction={() => router.push('/policy')}
          />
        ) : !isTemplate && !isValid ? (
          <Banner
            tone="warning"
            icon="alert-triangle"
            message={`Policy targets total ${formatPercent(targetSum)}. They must total 100% before drift can be evaluated.`}
            actionLabel="Fix policy"
            onAction={() => router.push('/policy')}
          />
        ) : null}

        {error ? (
          <Card>
            <ErrorState
              message={
                error instanceof Error
                  ? error.message
                  : 'The portfolio service could not be reached.'
              }
              onRetry={refetch}
            />
          </Card>
        ) : isLoading ? (
          <AllocationSkeleton />
        ) : summary.assetCount === 0 ? (
          <Card>
            <EmptyState
              icon="target"
              title="No allocation to analyse"
              message="Add assets to compare your current allocation with your policy targets."
              actionLabel="Add an asset"
              onAction={() => router.push('/asset/new')}
            />
          </Card>
        ) : (
          <>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryGrid}>
                <SummaryStat
                  label="Portfolio"
                  value={formatCompactINR(analytics.totals.portfolio)}
                  hint={`${summary.assetCount} ${summary.assetCount === 1 ? 'asset' : 'assets'}`}
                  icon="pie-chart"
                  color="#2563EB"
                />
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <SummaryStat
                  label="Policy"
                  value={
                    isTemplate
                      ? 'Template'
                      : targetedCount === 0
                        ? 'Unmanaged'
                        : !isValid
                          ? 'Needs attention'
                          : `v${policyConfig.policy.version}`
                  }
                  hint={
                    isTemplate
                      ? isDemo
                        ? 'Read-only in demo'
                        : 'Confirm targets'
                      : targetedCount === 0
                        ? 'No sleeve targets'
                        : !isValid
                          ? `Totals ${formatPercent(targetSum)}`
                          : `${targetedCount} sleeves`
                  }
                  icon="sliders"
                  color="#D97706"
                />
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <SummaryStat
                  label="In tolerance"
                  value={
                    isTemplate || !isValid
                      ? '—'
                      : targetedCount > 0
                        ? `${inToleranceCount}/${targetedCount}`
                        : '—'
                  }
                  hint={
                    isTemplate
                      ? isDemo
                        ? 'Read-only in demo'
                        : 'Confirm policy'
                      : targetedCount === 0
                        ? 'Set policy'
                        : !isValid
                          ? 'Fix targets'
                          : 'Sleeve-level bands'
                  }
                  icon="check-circle"
                  color="#059669"
                />
              </View>
            </Card>

            {!isTemplate && isValid && offPolicy.length > 0 ? (
              <DriftMonitor sleeves={offPolicy} />
            ) : !isTemplate && isValid && targetedCount > 0 ? (
              <Card style={styles.onTargetCard}>
                <View style={[styles.onTargetIcon, { backgroundColor: colors.positiveSoft }]}>
                  <Feather name="check" size={15} color={colors.positive} />
                </View>
                <View style={styles.onTargetText}>
                  <Text style={[type.title, { color: colors.text }]}>Portfolio is on policy</Text>
                  <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>
                    Every sleeve is inside its tolerance band. Largest drift{' '}
                    {formatDriftPp(policyEvaluation.worstDriftPp)}.
                  </Text>
                </View>
                <Badge label={status.badgeLabel} tone={status.badgeTone} />
              </Card>
            ) : null}

            {unmanaged.length > 0 ? (
              <UnmanagedCard
                slices={unmanaged}
                readOnly={isDemo}
                onExtend={() => router.push('/policy')}
              />
            ) : null}

            <View>
              <SectionHeader
                title="Allocation tree"
                subtitle="Root sleeves carry the policy; tap to inspect sub-sleeves and holdings"
              />
              <AllocationAnalysisCard
                nodes={analytics.allocationAnalysis}
                total={analytics.totals.portfolio}
                policy={policyEvaluation}
                policyVersion={policyConfig.policy.version}
              />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

interface SummaryStatProps {
  label: string;
  value: string;
  hint: string;
  icon: ComponentProps<typeof Feather>['name'];
  color: string;
}

function SummaryStat({ label, value, hint, icon, color }: SummaryStatProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.summaryStat}>
      <View style={styles.summaryLabelRow}>
        <Feather name={icon} size={11} color={color} />
        <Text style={[styles.summaryLabel, { color: colors.muted }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text
        style={[styles.summaryValue, numeric, { color: colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {value}
      </Text>
      <Text style={[styles.summaryHint, { color: colors.muted }]} numberOfLines={1}>
        {hint}
      </Text>
    </View>
  );
}

interface DriftMonitorProps {
  sleeves: PolicySleeveEvaluation[];
}

/** Largest policy gaps, framed as rebalancing actions. */
function DriftMonitor({ sleeves }: DriftMonitorProps) {
  const { colors } = useTheme();
  const overweight = sleeves.filter((sleeve) => sleeve.driftPp > 0).length;
  const underweight = sleeves.length - overweight;
  const breaches = sleeves.filter((sleeve) => sleeve.status === 'breach').length;
  const watches = sleeves.length - breaches;

  return (
    <Card style={styles.driftCard}>
      <View style={styles.driftHeader}>
        <View style={[styles.driftIcon, { backgroundColor: colors.warningSoft }]}>
          <Feather name="activity" size={15} color={colors.warning} />
        </View>
        <View style={styles.driftHeaderText}>
          <Text style={[type.title, { color: colors.text }]}>Drift monitor</Text>
          <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>
            {breaches > 0
              ? `${breaches} outside band${watches > 0 ? ` · ${watches} near band` : ''}`
              : `${watches} nearing tolerance`}
          </Text>
        </View>
        <Badge label={`${overweight} over · ${underweight} under`} tone="warning" />
      </View>

      <View style={styles.driftRows}>
        {sleeves.map((sleeve) => {
          const over = sleeve.driftPp > 0;
          const breach = sleeve.status === 'breach';
          const tone = breach ? colors.negative : colors.warning;
          const soft = breach ? colors.negativeSoft : colors.warningSoft;
          return (
            <View
              key={sleeve.path}
              style={[styles.driftRow, { backgroundColor: colors.cardMuted }]}
            >
              <View style={[styles.driftRowIcon, { backgroundColor: soft }]}>
                <Feather
                  name={over ? 'arrow-up-right' : 'arrow-down-right'}
                  size={13}
                  color={tone}
                />
              </View>
              <View style={styles.driftRowText}>
                <Text style={[styles.driftName, { color: colors.text }]} numberOfLines={1}>
                  {sleeve.label}
                </Text>
                <Text style={[styles.driftHint, { color: colors.muted }]} numberOfLines={1}>
                  {formatCompactINR(Math.abs(sleeve.driftValue))} {over ? 'above' : 'below'} · target{' '}
                  {formatPercent(sleeve.targetPercentage)} ±{sleeve.bandPp}pp
                </Text>
              </View>
              <View style={styles.driftRight}>
                <Badge
                  label={breach ? 'Breach' : 'Watch'}
                  tone={breach ? 'negative' : 'warning'}
                />
                <Text style={[styles.driftPercent, numeric, { color: tone }]}>
                  {formatDriftPp(sleeve.driftPp, { signed: true })}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={[styles.driftFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.driftFooterText, { color: colors.muted }]}>
          Rebalance with new contributions first, then trim overweight sleeves. Bands apply to
          each sleeve independently.
        </Text>
      </View>
    </Card>
  );
}

interface UnmanagedCardProps {
  slices: PolicyUnmanagedSlice[];
  readOnly?: boolean;
  onExtend: () => void;
}

/** Holdings that count in the portfolio but have no policy target. */
function UnmanagedCard({ slices, readOnly = false, onExtend }: UnmanagedCardProps) {
  const { colors } = useTheme();
  const percentage = slices.reduce((sum, slice) => sum + slice.currentPercentage, 0);
  const value = slices.reduce((sum, slice) => sum + slice.currentValue, 0);

  return (
    <Card style={styles.unmanagedCard}>
      <View style={styles.unmanagedHeader}>
        <View style={[styles.unmanagedIcon, { backgroundColor: colors.warningSoft }]}>
          <Feather name="help-circle" size={15} color={colors.warning} />
        </View>
        <View style={styles.unmanagedHeaderText}>
          <Text style={[type.title, { color: colors.text }]}>Outside policy</Text>
          <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>
            {formatCompactINR(value)} ({formatPercent(percentage)} of value) sits outside every sleeve
          </Text>
        </View>
        <Badge label="Unmanaged" tone="warning" />
      </View>

      <View style={styles.unmanagedRows}>
        {slices.map((slice) => (
          <View key={slice.path} style={styles.unmanagedRow}>
            <View style={[styles.unmanagedDot, { backgroundColor: slice.color }]} />
            <Text style={[styles.unmanagedName, { color: colors.textSecondary }]} numberOfLines={1}>
              {slice.label}
            </Text>
            <Text style={[styles.unmanagedPercent, numeric, { color: colors.muted }]}>
              {formatPercent(slice.currentPercentage)}
            </Text>
            <Text style={[styles.unmanagedValue, numeric, { color: colors.textSecondary }]}>
              {formatCompactINR(slice.currentValue)}
            </Text>
          </View>
        ))}
      </View>

      <Button
        label={readOnly ? 'View policy' : 'Add to policy'}
        onPress={onExtend}
        variant="secondary"
        size="sm"
        icon={readOnly ? 'eye' : 'plus'}
      />
    </Card>
  );
}

function AllocationSkeleton() {
  return (
    <View style={styles.skeletonStack}>
      <Skeleton height={122} borderRadius={16} />
      <Skeleton height={190} borderRadius={16} />
      <Skeleton height={360} borderRadius={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.xl },
  summaryCard: { paddingVertical: space.lg },
  summaryGrid: { flexDirection: 'row', alignItems: 'stretch' },
  summaryStat: { flex: 1, gap: 3, paddingHorizontal: space.xs },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  summaryLabel: { ...type.label, fontSize: 9, letterSpacing: 0.3, flex: 1 },
  summaryValue: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  summaryHint: { fontSize: 9 },
  summaryDivider: { width: StyleSheet.hairlineWidth, marginVertical: 2 },
  onTargetCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  onTargetIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onTargetText: { flex: 1 },
  driftCard: { gap: space.md },
  driftHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  driftIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driftHeaderText: { flex: 1 },
  driftRows: { gap: space.sm },
  driftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    padding: space.md,
  },
  driftRowIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driftRowText: { flex: 1 },
  driftName: { fontSize: 12, fontWeight: '600' },
  driftHint: { fontSize: 10, marginTop: 1 },
  driftRight: { alignItems: 'flex-end', gap: 3 },
  driftPercent: { fontSize: 12, fontWeight: '600' },
  driftFooter: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm },
  driftFooterText: { fontSize: 10, lineHeight: 15 },
  unmanagedCard: { gap: space.md },
  unmanagedHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  unmanagedIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unmanagedHeaderText: { flex: 1 },
  unmanagedRows: { gap: space.xs },
  unmanagedRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  unmanagedDot: { width: 6, height: 6, borderRadius: radius.full },
  unmanagedName: { flex: 1, fontSize: 11 },
  unmanagedPercent: { width: 48, fontSize: 10, textAlign: 'right' },
  unmanagedValue: { width: 66, fontSize: 10, textAlign: 'right' },
  skeletonStack: { gap: space.xl },
});
