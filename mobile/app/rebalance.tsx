import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Badge, type BadgeTone } from '@/src/components/ui/Badge';
import { Banner } from '@/src/components/ui/Banner';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Chip } from '@/src/components/ui/Chip';
import { IconButton } from '@/src/components/ui/IconButton';
import { LoadingProgress } from '@/src/components/ui/LoadingProgress';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/src/components/ui/States';
import { TextField } from '@/src/components/ui/TextField';
import { statusForDrift, type PolicyStatus } from '@/src/features/portfolio/policy';
import { usePortfolioData } from '@/src/features/portfolio/queries';
import {
  planRebalance,
  type RebalancePlan,
  type RebalanceProjectionRow,
} from '@/src/features/portfolio/rebalance';
import {
  useRebalanceJournal,
  type RebalanceRecord,
} from '@/src/features/portfolio/rebalanceJournal';
import { buildSipPlan, type SipPlan } from '@/src/features/portfolio/sip';
import {
  formatCompactINR,
  formatDriftPp,
  formatINR,
  formatPercent,
  toPaise,
} from '@/src/lib/format/money';
import { numeric, radius, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

const PRESETS = [10_000, 50_000, 1_00_000, 5_00_000];
const MAX_CONTRIBUTION_DIGITS = 9;

const STATUS_LABEL: Record<PolicyStatus, string> = {
  within: 'Within',
  watch: 'Near band',
  breach: 'Breach',
};

const STATUS_TONE: Record<PolicyStatus, BadgeTone> = {
  within: 'positive',
  watch: 'warning',
  breach: 'negative',
};

function presetLabel(rupees: number): string {
  return rupees >= 1_00_000 ? `₹${rupees / 1_00_000}L` : `₹${rupees / 1_000}k`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function sanitizeAmount(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, MAX_CONTRIBUTION_DIGITS);
}

interface PlanView {
  badge: string;
  tone: BadgeTone;
  icon: ComponentProps<typeof Feather>['name'];
  headline: string;
  detail: string;
}

function planView(plan: RebalancePlan, hasOverweight: boolean): PlanView {
  switch (plan.status) {
    case 'no-targets':
      return {
        badge: 'No targets',
        tone: 'neutral',
        icon: 'target',
        headline: 'Set targets first',
        detail: 'Confirm a policy with sleeve targets and bands before sizing trades.',
      };
    case 'no-action': {
      const watch = plan.before.watchCount;
      return {
        badge: 'No action',
        tone: 'positive',
        icon: 'check-circle',
        headline: 'No rebalance needed',
        detail:
          watch > 0
            ? `${watch} sleeve${watch === 1 ? '' : 's'} near the band, but none outside tolerance.`
            : 'Every sleeve is inside its band. New contributions will follow your target weights.',
      };
    }
    case 'idle':
      return {
        badge: 'Action needed',
        tone: plan.before.breachCount > 0 ? 'negative' : 'warning',
        icon: 'alert-triangle',
        headline: 'Rebalance needed',
        detail: `${formatCompactINR(
          plan.underweightGap,
        )} underweight and ${formatCompactINR(
          plan.overweightGap,
        )} overweight. Add new money to fund the gaps${
          hasOverweight ? ', or enable trims to rebalance now.' : '.'
        }`,
      };
    case 'fund': {
      const remaining = plan.after.breachCount;
      return {
        badge: 'Contribution',
        tone: 'accent',
        icon: 'plus-circle',
        headline: 'Rebalance with new money',
        detail: `${formatCompactINR(
          plan.contribution,
        )} of new money funds the largest gaps first.${
          remaining > 0
            ? ` ${remaining} sleeve${remaining === 1 ? '' : 's'} would remain outside band${
                hasOverweight ? '; enable trims to finish.' : '.'
              }`
            : ' Every sleeve is projected inside its band.'
        }`,
      };
    }
    case 'trim':
      return {
        badge: 'Trims',
        tone: 'warning',
        icon: 'repeat',
        headline: 'Rebalance with trims',
        detail: `${formatCompactINR(
          plan.totalSell,
        )} from overweight sleeves funds ${formatCompactINR(
          plan.totalBuy,
        )} of underweight gaps.`,
      };
    case 'fund-and-trim':
      return {
        badge: 'Fund + trim',
        tone: 'accent',
        icon: 'sliders',
        headline: 'Rebalance with money and trims',
        detail: `${formatCompactINR(
          plan.contribution,
        )} of new money plus ${formatCompactINR(
          plan.totalSell,
        )} of trims close the gaps.${
          plan.after.breachCount === 0
            ? ' Every sleeve is projected inside its band.'
            : ''
        }`,
      };
  }
}

export default function RebalanceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    summary,
    progress,
    analytics,
    policyConfig,
    policyEvaluation,
    isLoading,
    isRefreshing,
    error,
    priceError,
    isDemo,
    refetch,
  } = usePortfolioData();
  const { records, record } = useRebalanceJournal();

  const [contributionText, setContributionText] = useState('');
  const [trimOverweight, setTrimOverweight] = useState(false);
  // Keyed by `sleeve::symbol` so the choice survives contribution edits.
  const [sipExcluded, setSipExcluded] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const contribution = useMemo(() => {
    const rupees = Number(contributionText);
    return Number.isFinite(rupees) ? toPaise(Math.max(0, rupees)) : 0;
  }, [contributionText]);

  const plan = useMemo(
    () =>
      planRebalance({
        evaluation: policyEvaluation,
        contribution,
        trimOverweight,
        minCashPct: policyConfig.policy.rebalance.minCashPct,
      }),
    [
      policyEvaluation,
      contribution,
      trimOverweight,
      policyConfig.policy.rebalance.minCashPct,
    ],
  );

  const hasOverweight = policyEvaluation.sleeves.some(
    (sleeve) => sleeve.currentValue > sleeve.targetValue + 1,
  );

  const sipPlan = useMemo(
    () =>
      buildSipPlan({
        rows: plan.rows,
        nodes: analytics.allocationAnalysis,
        contribution: plan.contribution,
        excluded: sipExcluded,
      }),
    [plan.rows, plan.contribution, analytics.allocationAnalysis, sipExcluded],
  );

  const toggleSipAsset = (key: string) => {
    setSipExcluded((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const resetSipSelection = () => setSipExcluded(new Set());

  const handleRecord = async (): Promise<string | null> => {
    const saved = await record({
      contribution: plan.contribution,
      bought: plan.totalBuy,
      sold: plan.totalSell,
      projectedWorstDriftPp: plan.after.worstDriftPp,
      policyVersion: policyConfig.policy.version,
      sleeveCount: plan.rows.length,
    });
    return saved?.completedAt ?? null;
  };

  return (
    <Screen refreshing={isRefreshing} onRefresh={refetch}>
      <ScreenHeader
        eyebrow="Allocation plan"
        title="Rebalance"
        subtitle="Close the gaps with new money first"
        leading={
          <IconButton
            icon="arrow-left"
            variant="plain"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/')
            }
            accessibilityLabel="Back to allocation"
          />
        }
        action={
          <IconButton
            icon="refresh-cw"
            onPress={refetch}
            accessibilityLabel="Refresh rebalance plan"
          />
        }
      />

      <View style={styles.stack}>
        {isDemo ? (
          <Banner
            tone="warning"
            icon="play-circle"
            message="Simulation is available in the demo. Sign in to record an executed rebalance."
          />
        ) : null}

        {error ? (
          <Card>
            <ErrorState
              message={
                error instanceof Error
                  ? error.message
                  : 'The portfolio could not be loaded.'
              }
              onRetry={refetch}
            />
          </Card>
        ) : isLoading ? (
          <PlannerSkeleton />
        ) : summary.assetCount === 0 ? (
          <Card>
            <EmptyState
              icon="inbox"
              title="Nothing to rebalance"
              message="Add holdings first, then compare them with your sleeve targets."
              actionLabel={isDemo ? undefined : 'Add holding'}
              onAction={isDemo ? undefined : () => router.push('/asset/new')}
            />
          </Card>
        ) : (
          <>
            {progress.active ? (
              <LoadingProgress progress={progress} compact />
            ) : null}

            {priceError ? (
              <Banner
                tone="warning"
                icon="clock"
                message="Live prices are unavailable. The plan uses your average cost until quotes return."
              />
            ) : null}

            {plan.status === 'no-targets' ? (
              <Card>
                <EmptyState
                  icon="target"
                  title="Set targets first"
                  message="The planner sizes trades against confirmed sleeve targets and bands. Confirm a policy to see add and trim amounts."
                  actionLabel={isDemo ? 'View policy' : 'Open policy'}
                  onAction={() => router.push('/policy')}
                />
              </Card>
            ) : (
              <>
                <PlanSummaryCard
                  plan={plan}
                  hasOverweight={hasOverweight}
                  minCashPct={policyConfig.policy.rebalance.minCashPct}
                />

                <View>
                  <SectionHeader
                    title="Simulate"
                    subtitle="Size new money, then decide whether to trim"
                  />
                  <Card style={styles.card}>
                    <TextField
                      label="New contribution (₹)"
                      value={contributionText}
                      onChangeText={(value) => setContributionText(sanitizeAmount(value))}
                      placeholder="0"
                      keyboardType="number-pad"
                      inputMode="numeric"
                      selectTextOnFocus
                      hint={
                        contribution > 0
                          ? `${formatINR(contribution)} of new money`
                          : 'Leave at 0 to plan without new money'
                      }
                    />

                    <View style={styles.presets}>
                      {PRESETS.map((preset) => (
                        <Chip
                          key={preset}
                          label={presetLabel(preset)}
                          selected={contribution === toPaise(preset)}
                          onPress={() => setContributionText(String(preset))}
                        />
                      ))}
                      {contribution > 0 ? (
                        <Chip
                          label="Clear"
                          icon="x"
                          onPress={() => setContributionText('')}
                        />
                      ) : null}
                    </View>

                    {hasOverweight ? (
                      <View style={[styles.trimRow, { borderTopColor: colors.border }]}>
                        <View style={styles.trimText}>
                          <Text style={[type.bodyMedium, { color: colors.text }]}>
                            Trim overweight sleeves
                          </Text>
                          <Text style={[styles.trimHint, { color: colors.muted }]}>
                            {plan.afterContribution.breachCount === 0
                              ? contribution > 0
                                ? 'New money alone restores every band; trims are not needed.'
                                : 'No sleeve is outside its band; trims are not needed.'
                              : trimOverweight
                                ? `Sell ${formatCompactINR(
                                    plan.totalSell,
                                  )} from overweight sleeves to finish the rebalance.`
                                : `${plan.afterContribution.breachCount} sleeve${
                                    plan.afterContribution.breachCount === 1 ? '' : 's'
                                  } still outside band after new money.`}
                          </Text>
                        </View>
                        <Switch
                          value={trimOverweight}
                          onValueChange={setTrimOverweight}
                          trackColor={{
                            false: colors.border,
                            true: colors.accent,
                          }}
                          thumbColor={
                            trimOverweight ? colors.accentText : colors.card
                          }
                          ios_backgroundColor={colors.border}
                          accessibilityLabel="Trim overweight sleeves"
                          accessibilityHint="Sells overweight sleeves back to target only when new money leaves a breach"
                        />
                      </View>
                    ) : (
                      <Text style={[styles.trimHint, { color: colors.muted }]}>
                        No overweight sleeve needs trimming.
                      </Text>
                    )}

                    <Text style={[styles.caption, { color: colors.muted }]}>
                      Cash is trimmed no lower than the{' '}
                      {policyConfig.policy.rebalance.minCashPct}% reserve floor.
                    </Text>
                  </Card>
                </View>

                <TradesCard plan={plan} />
                {plan.contribution > 0 ? (
                  <SipCard
                    sip={sipPlan}
                    onToggle={toggleSipAsset}
                    onReset={resetSipSelection}
                  />
                ) : null}
                <ProjectionCard
                  plan={plan}
                  minCashPct={policyConfig.policy.rebalance.minCashPct}
                />

                <ExecuteCard
                  key={`${plan.contribution}:${plan.totalBuy}:${plan.totalSell}`}
                  plan={plan}
                  isDemo={isDemo}
                  onRecord={handleRecord}
                />

                <HistoryCard records={records} />

                <Text style={[styles.footer, { color: colors.muted }]}>
                  Plans use current values and policy bands. Prices move, so
                  re-run the plan before executing. Trades are sleeve guidance,
                  not orders.
                </Text>
              </>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

interface PlanSummaryCardProps {
  plan: RebalancePlan;
  hasOverweight: boolean;
  minCashPct: number;
}

function PlanSummaryCard({ plan, hasOverweight, minCashPct }: PlanSummaryCardProps) {
  const { colors } = useTheme();
  const view = planView(plan, hasOverweight);
  const toneFg = {
    positive: colors.positive,
    negative: colors.negative,
    warning: colors.warning,
    accent: colors.accent,
    neutral: colors.muted,
  }[view.tone];
  const toneBg = {
    positive: colors.positiveSoft,
    negative: colors.negativeSoft,
    warning: colors.warningSoft,
    accent: colors.accentSoft,
    neutral: colors.cardMuted,
  }[view.tone];

  const outsidePercentage =
    plan.afterTotal > 0 ? (plan.outsidePolicy / plan.afterTotal) * 100 : 0;
  const driftValue = `${plan.before.worstDriftPp.toFixed(1)} → ${plan.after.worstDriftPp.toFixed(1)}`;
  const breachValue = `${plan.before.breachCount} → ${plan.after.breachCount}`;

  return (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <View style={[styles.summaryIcon, { backgroundColor: toneBg }]}>
          <Feather name={view.icon} size={18} color={toneFg} />
        </View>
        <View style={styles.summaryText}>
          <Text style={[type.title, { color: colors.text }]}>{view.headline}</Text>
          <Text style={[styles.summaryDetail, { color: colors.textSecondary }]}>
            {view.detail}
          </Text>
        </View>
        <Badge label={view.badge} tone={view.tone} />
      </View>

      <View style={styles.summaryStats}>
        <SummaryStat
          label="Worst drift"
          value={driftValue}
          hint="pp"
          tone={
            plan.after.breachCount > 0 ? colors.negative : colors.positive
          }
          accessibilityLabel={`Worst drift ${plan.before.worstDriftPp.toFixed(
            1,
          )} percentage points now, ${plan.after.worstDriftPp.toFixed(
            1,
          )} after the plan`}
        />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <SummaryStat
          label="Outside band"
          value={breachValue}
          hint="sleeves"
          tone={
            plan.after.breachCount > 0 ? colors.negative : colors.positive
          }
          accessibilityLabel={`${plan.before.breachCount} sleeves outside band now, ${plan.after.breachCount} after the plan`}
        />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <SummaryStat
          label="Total buys"
          value={formatCompactINR(plan.totalBuy)}
          hint="new money + trims"
          tone={plan.totalBuy > 0 ? colors.accent : colors.muted}
          accessibilityLabel={`${formatINR(
            plan.totalBuy,
          )} of total buys, including ${formatINR(
            plan.contribution,
          )} of new money`}
        />
      </View>

      <View style={styles.segmentsBlock}>
        <SegmentRow
          label="Now"
          statuses={plan.rows.map((row) =>
            statusForDrift(row.currentDriftPp, row.bandPp),
          )}
        />
        <SegmentRow
          label="After"
          statuses={plan.rows.map((row) => row.projectedStatus)}
        />
      </View>

      {plan.outsidePolicy > 50 ? (
        <SummaryNote
          icon="help-circle"
          text={`${formatCompactINR(
            plan.outsidePolicy,
          )} (${formatPercent(
            outsidePercentage,
          )}) sits outside policy and cannot reach a sleeve target.`}
        />
      ) : null}

      {plan.cashFloorHeld > 50 ? (
        <SummaryNote
          icon="shield"
          text={`Cash is held ${formatCompactINR(
            plan.cashFloorHeld,
          )} above target to respect the ${minCashPct}% reserve floor.`}
        />
      ) : null}
    </Card>
  );
}

function SegmentRow({
  label,
  statuses,
}: {
  label: string;
  statuses: PolicyStatus[];
}) {
  const { colors } = useTheme();
  const color = (status: PolicyStatus) =>
    status === 'within'
      ? colors.positive
      : status === 'watch'
        ? colors.warning
        : colors.negative;
  const within = statuses.filter((status) => status === 'within').length;
  const watch = statuses.filter((status) => status === 'watch').length;
  const breach = statuses.filter((status) => status === 'breach').length;

  return (
    <View
      style={styles.segmentRow}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${label}: ${within} within band, ${watch} near band, ${breach} outside band`}
    >
      <Text style={[styles.segmentLabel, { color: colors.muted }]}>{label}</Text>
      <View style={styles.segments}>
        {statuses.map((status, index) => (
          <View
            key={`${label}-${index}`}
            style={[styles.segment, { backgroundColor: color(status) }]}
          />
        ))}
      </View>
    </View>
  );
}

function SummaryStat({
  label,
  value,
  hint,
  tone,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  hint: string;
  tone: string;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.summaryStat} accessible accessibilityLabel={accessibilityLabel}>
      <Text style={[styles.statLabel, { color: colors.muted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.statValue, numeric, { color: tone }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>
      <Text style={[styles.statHint, { color: colors.muted }]} numberOfLines={1}>
        {hint}
      </Text>
    </View>
  );
}

function SummaryNote({
  icon,
  text,
}: {
  icon: ComponentProps<typeof Feather>['name'];
  text: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.note}>
      <Feather name={icon} size={12} color={colors.muted} />
      <Text style={[styles.noteText, { color: colors.muted }]}>{text}</Text>
    </View>
  );
}

function TradesCard({ plan }: { plan: RebalancePlan }) {
  const { colors } = useTheme();
  const count = plan.buys.length + plan.sells.length;

  return (
    <View>
      <SectionHeader
        title="Trades"
        subtitle={
          count > 0
            ? `${plan.buys.length} buy${plan.buys.length === 1 ? '' : 's'} · ${
                plan.sells.length
              } trim${plan.sells.length === 1 ? '' : 's'}`
            : 'Sleeve-level amounts to execute'
        }
        trailing={
          count > 0 ? (
            <Badge label={`${count}`} tone="accent" />
          ) : undefined
        }
      />
      <Card padded={false} style={styles.tradesCard}>
        {count === 0 ? (
          <View style={styles.emptyTrades}>
            <Feather
              name={plan.status === 'no-action' ? 'check-circle' : 'sliders'}
              size={18}
              color={
                plan.status === 'no-action' ? colors.positive : colors.muted
              }
            />
            <Text style={[styles.emptyTradesText, { color: colors.muted }]}>
              {plan.status === 'no-action'
                ? 'No trades required. Every sleeve is inside its band.'
                : 'Add a contribution or enable trims to see the plan.'}
            </Text>
          </View>
        ) : (
          <>
            {plan.buys.map((row, index) => (
              <View key={`buy-${row.path}`}>
                {index > 0 ? (
                  <View
                    style={[styles.tradeDivider, { backgroundColor: colors.border }]}
                  />
                ) : null}
                <TradeRow row={row} action="buy" />
              </View>
            ))}
            {plan.sells.map((row, index) => (
              <View key={`sell-${row.path}`}>
                {plan.buys.length + index > 0 ? (
                  <View
                    style={[styles.tradeDivider, { backgroundColor: colors.border }]}
                  />
                ) : null}
                <TradeRow row={row} action="sell" />
              </View>
            ))}
            <View style={[styles.tradeTotals, { borderTopColor: colors.border }]}>
              <TradeTotal label="New money" value={formatCompactINR(plan.contribution)} />
              <TradeTotal label="Trim proceeds" value={formatCompactINR(plan.totalSell)} />
              <TradeTotal label="Total buys" value={formatCompactINR(plan.totalBuy)} />
            </View>
          </>
        )}
      </Card>
      {count > 0 ? (
        <Text style={[styles.cardNote, { color: colors.muted }]}>
          Choose the holdings inside each sleeve when you execute. The plan does
          not create orders.
        </Text>
      ) : null}
    </View>
  );
}

function TradeRow({
  row,
  action,
}: {
  row: RebalanceProjectionRow;
  action: 'buy' | 'sell';
}) {
  const { colors } = useTheme();
  const amount = action === 'buy' ? row.buyAmount : row.sellAmount;
  const tint = action === 'buy' ? colors.accent : colors.warning;
  const soft = action === 'buy' ? colors.accentSoft : colors.warningSoft;

  return (
    <View style={styles.tradeRow}>
      <View style={[styles.tradeIcon, { backgroundColor: soft }]}>
        <Feather
          name={action === 'buy' ? 'arrow-down-left' : 'arrow-up-right'}
          size={15}
          color={tint}
        />
      </View>
      <View style={styles.tradeBody}>
        <View style={styles.tradeTop}>
          <Text style={[styles.tradeName, { color: colors.text }]} numberOfLines={1}>
            {row.label}
          </Text>
          <Text
            style={[styles.tradeAmount, numeric, { color: tint }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {action === 'buy' ? '+' : '−'}
            {formatINR(amount)}
          </Text>
        </View>
        <View style={styles.tradeMeta}>
          <Text
            style={[styles.tradeHint, { color: colors.muted }]}
            numberOfLines={1}
          >
            {formatPercent(row.currentPercentage)} →{' '}
            {formatPercent(row.projectedPercentage)} · target{' '}
            {formatPercent(row.targetPercentage)}
          </Text>
          <Badge
            label={STATUS_LABEL[row.projectedStatus]}
            tone={STATUS_TONE[row.projectedStatus]}
          />
        </View>
      </View>
    </View>
  );
}

function TradeTotal({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.tradeTotal}>
      <Text style={[styles.statLabel, { color: colors.muted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.tradeTotalValue, numeric, { color: colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>
    </View>
  );
}

function SipCard({
  sip,
  onToggle,
  onReset,
}: {
  sip: SipPlan;
  onToggle: (key: string) => void;
  onReset: () => void;
}) {
  const { colors } = useTheme();
  const assignedPercentage =
    sip.contribution > 0 ? (sip.allocated / sip.contribution) * 100 : 0;
  const hasUnallocated = sip.unallocated > 50;
  const canReset = sip.selectedCount < sip.availableCount;

  return (
    <View>
      <SectionHeader
        title="SIP auto-fill"
        subtitle="New money by holding"
        trailing={
          <Badge
            label={`${Math.round(assignedPercentage)}% assigned`}
            tone={hasUnallocated ? 'warning' : 'positive'}
          />
        }
      />
      <Card padded={false} style={styles.sipCard}>
        <View style={[styles.sipSummary, { borderBottomColor: colors.border }]}>
          <View style={styles.sipSummaryText}>
            <Text style={[type.bodyMedium, { color: colors.text }]}>
              {formatINR(sip.contribution)} to invest
            </Text>
            <Text style={[styles.sipHint, { color: colors.muted }]}>
              New money funds the largest underweight sleeve first, then follows
              that sleeve&apos;s current holdings. Tap a holding to leave it out.
            </Text>
          </View>
          {canReset ? (
            <Chip label="Reset" icon="rotate-ccw" onPress={onReset} />
          ) : null}
        </View>

        {sip.sleeves.map((sleeve, index) => (
          <View
            key={sleeve.path}
            style={[
              styles.sipSleeve,
              index > 0
                ? {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                  }
                : null,
            ]}
          >
            <View style={styles.sipSleeveHeader}>
              <View style={[styles.dot, { backgroundColor: sleeve.color }]} />
              <Text
                style={[styles.sipSleeveName, { color: colors.text }]}
                numberOfLines={1}
              >
                {sleeve.label}
              </Text>
              <Text
                style={[styles.sipSleeveAmount, numeric, { color: colors.text }]}
                numberOfLines={1}
              >
                {formatINR(sleeve.amount)}
              </Text>
              <Text
                style={[
                  styles.sipSleevePercent,
                  numeric,
                  { color: colors.muted },
                ]}
                numberOfLines={1}
              >
                {formatPercent(sleeve.percentOfContribution)}
              </Text>
            </View>

            {sleeve.assets.length === 0 ? (
              <View style={styles.sipEmpty}>
                <Feather name="info" size={13} color={colors.warning} />
                <Text style={[styles.sipEmptyText, { color: colors.muted }]}>
                  No holding in this sleeve yet. {formatINR(sleeve.amount)} stays
                  unassigned until you add one.
                </Text>
              </View>
            ) : (
              sleeve.assets.map((asset) => (
                <Pressable
                  key={asset.key}
                  onPress={() => onToggle(asset.key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: asset.selected }}
                  accessibilityLabel={`${asset.name}, ${
                    asset.selected
                      ? `${formatINR(asset.amount)} of ${formatINR(
                          sip.contribution,
                        )}`
                      : 'excluded from this SIP'
                  }`}
                  style={({ pressed }) => [
                    styles.sipAsset,
                    !asset.selected ? styles.sipAssetExcluded : null,
                    pressed ? styles.sipAssetPressed : null,
                  ]}
                >
                  <View
                    style={[
                      styles.sipCheck,
                      asset.selected
                        ? {
                            backgroundColor: colors.accent,
                            borderColor: colors.accent,
                          }
                        : { borderColor: colors.border },
                    ]}
                  >
                    {asset.selected ? (
                      <Feather name="check" size={11} color={colors.accentText} />
                    ) : null}
                  </View>
                  <View style={styles.sipAssetBody}>
                    <Text
                      style={[styles.sipAssetName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {asset.name}
                    </Text>
                    <Text
                      style={[styles.sipAssetMeta, { color: colors.muted }]}
                      numberOfLines={1}
                    >
                      {asset.symbol
                        ? `${asset.symbol} · held ${formatCompactINR(
                            asset.currentValue,
                          )}`
                        : `Held ${formatCompactINR(asset.currentValue)}`}
                    </Text>
                  </View>
                  <View style={styles.sipAssetAmounts}>
                    <Text
                      style={[
                        styles.sipAssetAmount,
                        numeric,
                        { color: asset.selected ? colors.text : colors.muted },
                      ]}
                      numberOfLines={1}
                    >
                      {formatINR(asset.amount)}
                    </Text>
                    <Text
                      style={[styles.sipAssetPercent, { color: colors.muted }]}
                      numberOfLines={1}
                    >
                      {asset.selected
                        ? formatPercent(asset.percentOfContribution)
                        : 'Excluded'}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}

            {sleeve.assets.length > 0 && sleeve.unallocated > 50 ? (
              <Text style={[styles.sipSleeveNote, { color: colors.warning }]}>
                {formatINR(sleeve.unallocated)} unassigned in this sleeve
              </Text>
            ) : null}
          </View>
        ))}

        <View style={[styles.sipFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.sipFooterText, { color: colors.muted }]}>
            {sip.selectedCount}/{sip.availableCount} holdings selected
          </Text>
          <Text
            style={[
              styles.sipFooterText,
              { color: hasUnallocated ? colors.warning : colors.positive },
            ]}
          >
            {hasUnallocated
              ? `${formatINR(sip.unallocated)} unassigned`
              : 'Fully assigned'}
          </Text>
        </View>
      </Card>
      {hasUnallocated ? (
        <SummaryNote
          icon="alert-triangle"
          text={`${formatINR(
            sip.unallocated,
          )} of this contribution has no selected holding. Pick one above, or add a holding to the sleeve.`}
        />
      ) : (
        <Text style={[styles.cardNote, { color: colors.muted }]}>
          Percentages are of the money you entered and exclude trim proceeds.
        </Text>
      )}
    </View>
  );
}

function ProjectionCard({
  plan,
  minCashPct,
}: {
  plan: RebalancePlan;
  minCashPct: number;
}) {
  const { colors } = useTheme();
  const outsidePercentage =
    plan.afterTotal > 0 ? (plan.outsidePolicy / plan.afterTotal) * 100 : 0;

  return (
    <View>
      <SectionHeader
        title="Projected allocation"
        subtitle="Current versus after-trade weights"
        trailing={
          <Badge
            label={`${plan.after.inToleranceCount}/${plan.rows.length} in tolerance`}
            tone={plan.after.breachCount > 0 ? 'negative' : 'positive'}
          />
        }
      />
      <Card style={styles.projectionCard}>
        {plan.rows.map((row, index) => (
          <View key={row.path}>
            {index > 0 ? (
              <View
                style={[styles.projectionDivider, { backgroundColor: colors.border }]}
              />
            ) : null}
            <View style={styles.projectionRow}>
              <View style={styles.projectionTop}>
                <View style={[styles.dot, { backgroundColor: row.color }]} />
                <Text
                  style={[styles.projectionName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {row.label}
                </Text>
                <Text
                  style={[styles.projectionValues, numeric, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {formatPercent(row.currentPercentage)} →{' '}
                  <Text style={{ color: colors.text, fontWeight: '600' }}>
                    {formatPercent(row.projectedPercentage)}
                  </Text>
                </Text>
              </View>
              <View style={styles.projectionBottom}>
                <Text style={[styles.projectionHint, { color: colors.muted }]}>
                  Target {formatPercent(row.targetPercentage)} · ±{row.bandPp}pp
                  · after {formatDriftPp(row.projectedDriftPp, { signed: true })}
                </Text>
                <Badge
                  label={STATUS_LABEL[row.projectedStatus]}
                  tone={STATUS_TONE[row.projectedStatus]}
                />
              </View>
            </View>
          </View>
        ))}

        <View style={[styles.projectionFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.projectionFooterText, { color: colors.muted }]}>
            {plan.after.breachCount > 0
              ? `${plan.after.breachCount} sleeve${
                  plan.after.breachCount === 1 ? '' : 's'
                } remain outside band.`
              : 'Every sleeve is projected inside its band.'}
            {plan.outsidePolicy > 50
              ? ` ${formatCompactINR(
                  plan.outsidePolicy,
                )} (${formatPercent(outsidePercentage)}) sits outside policy.`
              : ''}
            {plan.cashFloorHeld > 50
              ? ` Cash keeps ${formatCompactINR(
                  plan.cashFloorHeld,
                )} above target for the ${minCashPct}% reserve floor.`
              : ''}
          </Text>
        </View>
      </Card>
    </View>
  );
}

interface ExecuteCardProps {
  plan: RebalancePlan;
  isDemo: boolean;
  onRecord: () => Promise<string | null>;
}

function ExecuteCard({ plan, isDemo, onRecord }: ExecuteCardProps) {
  const { colors } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justRecorded, setJustRecorded] = useState<string | null>(null);
  const canMark = plan.totalBuy > 0.5 || plan.totalSell > 0.5;

  if (!canMark) return null;

  const confirm = async () => {
    setSaving(true);
    try {
      const saved = await onRecord();
      if (saved) setJustRecorded(saved);
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  return (
    <View>
      <SectionHeader title="Execute" subtitle="Record the plan after the trades are placed" />
      <Card style={styles.card}>
        {isDemo ? (
          <View style={styles.demoRow}>
            <Feather name="lock" size={16} color={colors.muted} />
            <Text style={[styles.caption, { color: colors.muted }]}>
              Simulation only. Sign in to record an executed rebalance.
            </Text>
          </View>
        ) : justRecorded ? (
          <Banner
            tone="info"
            icon="check-circle"
            message={`Recorded ${formatDate(
              justRecorded,
            )}. Update your holdings to reflect the trades; drift keeps using actual positions.`}
          />
        ) : confirming ? (
          <View style={styles.confirmBlock}>
            <Text style={[type.bodyMedium, { color: colors.text }]}>
              Record this rebalance?
            </Text>
            <Text style={[styles.caption, { color: colors.muted }]}>
              {formatCompactINR(plan.totalBuy)} of buys and{' '}
              {formatCompactINR(plan.totalSell)} of trims will be saved to this
              device. Holdings are not changed.
            </Text>
            <View style={styles.confirmActions}>
              <Button
                label="Cancel"
                variant="secondary"
                size="sm"
                onPress={() => setConfirming(false)}
                style={styles.confirmButton}
              />
              <Button
                label="Confirm"
                size="sm"
                loading={saving}
                onPress={() => void confirm()}
                style={styles.confirmButton}
              />
            </View>
          </View>
        ) : (
          <>
            <Text style={[styles.caption, { color: colors.muted }]}>
              Mark the plan as executed to keep a local audit trail. Drift keeps
              reflecting actual holdings until you update them.
            </Text>
            <Button
              label="Mark rebalanced"
              icon="check"
              fullWidth
              onPress={() => setConfirming(true)}
            />
          </>
        )}
      </Card>
    </View>
  );
}

function HistoryCard({ records }: { records: RebalanceRecord[] }) {
  const { colors } = useTheme();
  if (records.length === 0) return null;

  return (
    <View>
      <SectionHeader
        title="Recorded rebalances"
        subtitle="Saved on this device, newest first"
      />
      <Card style={styles.historyCard}>
        {records.slice(0, 4).map((record, index) => (
          <View key={record.id}>
            {index > 0 ? (
              <View style={[styles.historyDivider, { backgroundColor: colors.border }]} />
            ) : null}
            <View style={styles.historyRow}>
              <View style={[styles.historyIcon, { backgroundColor: colors.positiveSoft }]}>
                <Feather name="check" size={13} color={colors.positive} />
              </View>
              <View style={styles.historyText}>
                <Text style={[styles.historyTitle, { color: colors.text }]}>
                  {formatDate(record.completedAt)}
                </Text>
                <Text style={[styles.historyHint, { color: colors.muted }]}>
                  {formatCompactINR(record.bought)} bought
                  {record.sold > 0
                    ? ` · ${formatCompactINR(record.sold)} trimmed`
                    : ''}
                  {' · '}projected worst drift{' '}
                  {formatDriftPp(record.projectedWorstDriftPp)}
                </Text>
              </View>
            </View>
          </View>
        ))}
        <Text style={[styles.historyFooter, { color: colors.muted }]}>
          Records do not change holdings or policy.
        </Text>
      </Card>
    </View>
  );
}

function PlannerSkeleton() {
  return (
    <View style={styles.skeletonStack}>
      <Skeleton height={250} borderRadius={16} />
      <Skeleton height={210} borderRadius={16} />
      <Skeleton height={220} borderRadius={16} />
      <Skeleton height={280} borderRadius={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.xl },
  card: { gap: space.md },
  caption: { fontSize: 11.5, lineHeight: 17 },
  cardNote: {
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: space.sm,
    paddingHorizontal: space.xxs,
  },
  footer: {
    fontSize: 10.5,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: space.lg,
  },
  summaryCard: { gap: space.md, paddingVertical: space.lg },
  summaryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1, gap: 2 },
  summaryDetail: { fontSize: 12, lineHeight: 17 },
  summaryStats: { flexDirection: 'row', alignItems: 'stretch' },
  summaryStat: { flex: 1, gap: 2, paddingHorizontal: space.xxs },
  statLabel: { ...type.label, fontSize: 9.5, letterSpacing: 0.35 },
  statValue: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  statHint: { fontSize: 9.5 },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: 2 },
  segmentsBlock: { gap: 5, marginTop: space.xxs },
  segmentRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  segmentLabel: { width: 38, fontSize: 9.5, fontWeight: '600' },
  segments: { flex: 1, flexDirection: 'row', gap: 3, height: 7 },
  segment: { flex: 1, borderRadius: radius.full },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    marginTop: 2,
  },
  noteText: { flex: 1, fontSize: 10.5, lineHeight: 15 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  trimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.md,
  },
  trimText: { flex: 1, gap: 2 },
  trimHint: { fontSize: 10.5, lineHeight: 15 },
  tradesCard: { overflow: 'hidden' },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
  },
  tradeIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeBody: { flex: 1, gap: 3 },
  tradeTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tradeName: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  tradeAmount: { fontSize: 13, fontWeight: '600', maxWidth: 138 },
  tradeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  tradeHint: { flex: 1, fontSize: 10 },
  tradeDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 32 + space.md + space.md,
  },
  tradeTotals: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  tradeTotal: { flex: 1, gap: 2, paddingHorizontal: space.xxs },
  tradeTotalValue: { fontSize: 12, fontWeight: '600' },
  emptyTrades: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.lg,
  },
  emptyTradesText: { flex: 1, fontSize: 11.5, lineHeight: 17 },
  sipCard: { overflow: 'hidden' },
  sipSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sipSummaryText: { flex: 1, gap: 2 },
  sipHint: { fontSize: 10.5, lineHeight: 15 },
  sipSleeve: {
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  sipSleeveHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sipSleeveName: { flex: 1, fontSize: 12, fontWeight: '600' },
  sipSleeveAmount: { fontSize: 12, fontWeight: '600' },
  sipSleevePercent: { width: 52, fontSize: 11, textAlign: 'right' },
  sipAsset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 6,
    paddingLeft: 6 + space.sm,
  },
  sipAssetExcluded: { opacity: 0.55 },
  sipAssetPressed: { opacity: 0.7 },
  sipCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sipAssetBody: { flex: 1, gap: 1 },
  sipAssetName: { fontSize: 11.5, fontWeight: '500' },
  sipAssetMeta: { fontSize: 9.5 },
  sipAssetAmounts: { alignItems: 'flex-end', gap: 1 },
  sipAssetAmount: { fontSize: 11.5, fontWeight: '600' },
  sipAssetPercent: { fontSize: 9.5 },
  sipSleeveNote: { fontSize: 9.5, paddingLeft: 6 + space.sm },
  sipEmpty: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingVertical: 2,
    paddingLeft: 6 + space.sm,
  },
  sipEmptyText: { flex: 1, fontSize: 10, lineHeight: 15 },
  sipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  sipFooterText: { fontSize: 10 },
  projectionCard: { gap: 0 },
  projectionRow: { gap: 3, paddingVertical: space.sm },
  projectionTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 6, height: 6, borderRadius: radius.full },
  projectionName: { flex: 1, fontSize: 12, fontWeight: '600' },
  projectionValues: { fontSize: 12 },
  projectionBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingLeft: 6 + space.sm,
  },
  projectionHint: { flex: 1, fontSize: 10 },
  projectionDivider: { height: StyleSheet.hairlineWidth },
  projectionFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.sm,
    marginTop: space.sm,
  },
  projectionFooterText: { fontSize: 10, lineHeight: 15 },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  confirmBlock: { gap: space.sm },
  confirmActions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  confirmButton: { flex: 1 },
  historyCard: { gap: 0 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingVertical: space.sm,
  },
  historyIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyText: { flex: 1, gap: 2 },
  historyTitle: { fontSize: 12, fontWeight: '600' },
  historyHint: { fontSize: 10, lineHeight: 15 },
  historyDivider: { height: StyleSheet.hairlineWidth, marginLeft: 28 + space.md },
  historyFooter: { fontSize: 10, marginTop: space.sm },
  skeletonStack: { gap: space.xl },
});
