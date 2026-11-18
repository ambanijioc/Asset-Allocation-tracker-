import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Donut } from '@/src/components/charts/Donut';
import { HoldingRow } from '@/src/components/portfolio/HoldingRow';
import { KpiGrid } from '@/src/components/portfolio/KpiGrid';
import { PolicyAllocationLegend } from '@/src/components/portfolio/PolicyAllocationLegend';
import { Banner } from '@/src/components/ui/Banner';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { IconButton } from '@/src/components/ui/IconButton';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/src/components/ui/States';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { usePortfolioData } from '@/src/features/portfolio/queries';
import { formatCompactINR, formatPercent } from '@/src/lib/format/money';
import { numeric, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, isDemo } = useAuth();
  const {
    summary,
    policyConfig,
    policyEvaluation,
    isLoading,
    isRefreshing,
    error,
    priceError,
    refetch,
  } = usePortfolioData();

  const displayName = user?.displayName?.trim() || user?.email?.split('@')[0] || 'there';
  const firstName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  const donutSlices = [
    ...policyEvaluation.sleeves.map((sleeve) => ({
      key: sleeve.path,
      value: Math.max(0, sleeve.currentValue),
      color: sleeve.color,
    })),
    ...policyEvaluation.unmanaged.map((slice) => ({
      key: slice.path,
      value: Math.max(0, slice.currentValue),
      color: slice.color,
    })),
  ].filter((slice) => slice.value > 0);

  const policySubtitle = policyEvaluation.isTemplate
    ? isDemo
      ? 'Default template · read-only in demo'
      : 'Default template · confirm your targets'
    : !policyEvaluation.isValid
      ? `Policy v${policyConfig.policy.version} · targets total ${formatPercent(
          policyEvaluation.targetSum,
        )}`
      : `Policy v${policyConfig.policy.version} · ${policyEvaluation.inToleranceCount}/${policyEvaluation.targetedCount} in tolerance${
          policyEvaluation.unmanaged.length > 0
            ? ` · ${formatPercent(policyEvaluation.unmanagedPercentage)} outside policy`
            : ''
        }`;

  return (
    <Screen refreshing={isRefreshing} onRefresh={refetch}>
      <ScreenHeader
        eyebrow={greeting()}
        title={`Hi, ${firstName}`}
        subtitle={isDemo ? 'Demo portfolio · read-only' : 'Your portfolio at a glance'}
        size="large"
        action={
          <View style={styles.headerActions}>
            <IconButton
              icon="message-circle"
              onPress={() => router.push('/assistant')}
              accessibilityLabel="Open the AI assistant"
            />
            <IconButton
              icon="refresh-cw"
              onPress={refetch}
              accessibilityLabel="Refresh portfolio"
            />
          </View>
        }
      />

      <View style={styles.stack}>
        {isDemo ? (
          <Banner
            tone="warning"
            icon="play-circle"
            message="You are exploring a bundled demo. Sign out and use your account to sync real holdings."
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
          <DashboardSkeleton />
        ) : summary.assetCount === 0 ? (
          <Card>
            <EmptyState
              icon="plus-circle"
              title="Your portfolio is empty"
              message="Add your first stock, fund, crypto or cash position to see allocation and P&L."
              actionLabel="Add an asset"
              onAction={() => router.push('/asset/new')}
            />
          </Card>
        ) : (
          <>
            <KpiGrid
              summary={summary}
              policy={policyEvaluation}
              policyReadOnly={isDemo}
              onPolicyPress={() => router.push('/policy')}
            />

            {priceError ? (
              <Banner
                tone="warning"
                icon="clock"
                message="Live prices are unavailable right now — values fall back to your average cost."
              />
            ) : null}

            {!policyEvaluation.isTemplate && !policyEvaluation.isValid ? (
              <Banner
                tone="warning"
                icon="alert-triangle"
                message={
                  policyEvaluation.targetedCount === 0
                    ? 'No sleeve targets are set. Assign targets so drift can be monitored.'
                    : `Policy targets total ${formatPercent(policyEvaluation.targetSum)}. They must total 100% before drift can be evaluated.`
                }
                actionLabel={policyEvaluation.targetedCount === 0 ? 'Set policy' : 'Fix policy'}
                onAction={() => router.push('/policy')}
              />
            ) : null}

            <View>
              <SectionHeader
                title="Allocation"
                subtitle={policySubtitle}
                actionLabel={isDemo ? 'View' : 'Manage'}
                onAction={() => router.push('/policy')}
              />
              <Card style={styles.allocationCard}>
                <View style={styles.donutWrap}>
                  <Donut
                    data={donutSlices}
                    accessibilityLabel={`Allocation across ${policyEvaluation.sleeves.length} policy sleeves${
                      policyEvaluation.unmanaged.length > 0
                        ? ` and ${policyEvaluation.unmanaged.length} unmanaged categories`
                        : ''
                    }`}
                  >
                    <Text style={[type.label, { color: colors.muted }]}>Total</Text>
                    <Text style={[styles.donutValue, numeric, { color: colors.text }]}>
                      {formatCompactINR(summary.currentValue)}
                    </Text>
                  </Donut>
                </View>
                <PolicyAllocationLegend evaluation={policyEvaluation} />
              </Card>
            </View>

            <Card
              onPress={() => router.push('/insights')}
              accessibilityLabel="Open portfolio insights"
              style={styles.insightCta}
            >
              <View style={[styles.insightIcon, { backgroundColor: colors.accentSoft }]}>
                <Feather name="activity" size={18} color={colors.accent} />
              </View>
              <View style={styles.insightText}>
                <Text style={[type.title, { color: colors.text }]}>Portfolio insights</Text>
                <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>
                  Market cap, sector look-through, fund overlap and concentration risk.
                </Text>
              </View>
              <Feather name="arrow-up-right" size={18} color={colors.muted} />
            </Card>

            <Card
              onPress={() => router.push('/assistant')}
              accessibilityLabel="Ask the AI assistant about your portfolio"
              style={styles.insightCta}
            >
              <View style={[styles.insightIcon, { backgroundColor: colors.accentSoft }]}>
                <Feather name="message-circle" size={18} color={colors.accent} />
              </View>
              <View style={styles.insightText}>
                <Text style={[type.title, { color: colors.text }]}>Ask the assistant</Text>
                <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>
                  Questions about your holdings, sectors or any stock. Read-only.
                </Text>
              </View>
              <Feather name="arrow-up-right" size={18} color={colors.muted} />
            </Card>

            <View>
              <SectionHeader
                title="Top holdings"
                actionLabel="View all"
                onAction={() => router.push('/assets')}
              />
              <Card padded={false} style={styles.holdingsCard}>
                {summary.topHoldings.map((holding, index) => (
                  <View key={holding.asset.id}>
                    {index > 0 ? (
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    ) : null}
                    <HoldingRow
                      holding={holding}
                      rank={index + 1}
                      weight={
                        summary.currentValue > 0
                          ? (holding.currentValue / summary.currentValue) * 100
                          : 0
                      }
                      onPress={() => router.push(`/asset/${holding.asset.id}`)}
                    />
                  </View>
                ))}
                {summary.assetCount > summary.topHoldings.length ? (
                  <View style={[styles.more, { borderTopColor: colors.border }]}>
                    <Button
                      label={`View ${summary.assetCount - summary.topHoldings.length} more`}
                      onPress={() => router.push('/assets')}
                      variant="ghost"
                      size="sm"
                    />
                  </View>
                ) : null}
              </Card>
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

function DashboardSkeleton() {
  return (
    <View style={styles.skeletonStack}>
      <View style={styles.skeletonRow}>
        <Skeleton height={118} borderRadius={16} style={styles.skeletonHalf} />
        <Skeleton height={118} borderRadius={16} style={styles.skeletonHalf} />
      </View>
      <View style={styles.skeletonRow}>
        <Skeleton height={118} borderRadius={16} style={styles.skeletonHalf} />
        <Skeleton height={118} borderRadius={16} style={styles.skeletonHalf} />
      </View>
      <Skeleton height={286} borderRadius={16} />
      <Skeleton height={220} borderRadius={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.xl },
  headerActions: { flexDirection: 'row', gap: space.sm },
  allocationCard: { gap: space.xl },
  donutWrap: { alignItems: 'center' },
  donutValue: { fontSize: 17, fontWeight: '600', marginTop: 2 },
  insightCta: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: { flex: 1 },
  holdingsCard: { overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 34 + space.md + space.lg },
  more: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: space.xs },
  skeletonStack: { gap: space.xl },
  skeletonRow: { flexDirection: 'row', gap: space.sm },
  skeletonHalf: { flex: 1 },
});
