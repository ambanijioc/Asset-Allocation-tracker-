import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Donut } from '@/src/components/charts/Donut';
import { Badge } from '@/src/components/ui/Badge';
import type { FundSlice } from '@/src/features/portfolio/analytics';
import { formatCompactINR, formatPercent } from '@/src/lib/format/money';
import { numeric, radius, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

import { AnalyticsCard } from './AnalyticsCard';

interface FundAllocationCardProps {
  funds: FundSlice[];
  coverage: { withData: number; total: number };
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

const ALLOCATION_COLORS = {
  Equity: '#2563EB',
  Debt: '#F59E0B',
  Cash: '#0D9488',
  Other: '#71717A',
} as const;

/** Donut of fund/ETF positions with per-fund look-through drill-down. */
export function FundAllocationCard({
  funds,
  coverage,
  isLoading,
  error,
  onRetry,
}: FundAllocationCardProps) {
  const { colors } = useTheme();
  const [openFunds, setOpenFunds] = useState<Record<string, boolean>>({});

  const total = funds.reduce((sum, fund) => sum + fund.value, 0);
  const complete = coverage.total > 0 && coverage.withData === coverage.total;

  return (
    <AnalyticsCard
      icon="briefcase"
      title="Mutual Fund / ETF Allocation"
      subtitle="Look-through by scheme"
      tint="#D97706"
      tintSoft="rgba(217, 119, 6, 0.12)"
      trailing={
        isLoading ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : coverage.total > 0 ? (
          <Badge
            label={`${coverage.withData}/${coverage.total} mapped`}
            tone={complete ? 'positive' : 'warning'}
          />
        ) : null
      }
    >
      {funds.length === 0 || total <= 0 ? (
        <Text style={[styles.empty, { color: colors.muted }]}>
          Add a mutual fund or ETF to see scheme-level exposure.
        </Text>
      ) : (
        <>
          <View style={styles.donutWrap}>
            <Donut
              data={funds.map((fund, index) => ({
                key: fund.key,
                value: fund.value,
                color: fundColors[index % fundColors.length],
              }))}
              size={168}
              strokeWidth={20}
              accessibilityLabel="Mutual fund and ETF allocation donut chart"
            >
              <Text style={[type.label, { color: colors.muted }]}>Fund assets</Text>
              <Text style={[styles.donutValue, numeric, { color: colors.text }]}>
                {formatCompactINR(total)}
              </Text>
            </Donut>
          </View>

          <View style={styles.rows}>
            {funds.map((fund, index) => {
              const percent = total > 0 ? (fund.value / total) * 100 : 0;
              const isOpen = Boolean(openFunds[fund.key]);
              const color = fundColors[index % fundColors.length];
              const constituents = fund.constituents;

              const assetAllocation =
                constituents.find((constituent) => constituent.assetAllocation)?.assetAllocation ??
                null;
              const sectorWeightings =
                constituents.find(
                  (constituent) => (constituent.sectorWeightings?.length ?? 0) > 0,
                )?.sectorWeightings ?? [];

              const subHoldings = mergeSubHoldings(constituents);
              const hasLookThrough =
                Boolean(assetAllocation) ||
                sectorWeightings.length > 0 ||
                subHoldings.length > 0;

              return (
                <View
                  key={fund.key}
                  style={[styles.rowCard, { backgroundColor: colors.cardMuted }]}
                >
                  <Pressable
                    onPress={() =>
                      setOpenFunds((current) => ({ ...current, [fund.key]: !current[fund.key] }))
                    }
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    accessibilityLabel={`${fund.name}, ${formatPercent(percent)} of fund assets`}
                    style={styles.rowHeader}
                  >
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    <Text style={[styles.fundName, { color: colors.text }]} numberOfLines={2}>
                      {fund.name}
                    </Text>
                    <View style={styles.rowValueWrap}>
                      <Text style={[styles.rowValue, numeric, { color: colors.text }]}>
                        {formatCompactINR(fund.value)}
                      </Text>
                      <Text style={[styles.rowPercent, numeric, { color: colors.muted }]}>
                        {formatPercent(percent)}
                      </Text>
                    </View>
                    <Feather
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={colors.muted}
                    />
                  </Pressable>

                  {isOpen ? (
                    <View style={[styles.detail, { borderTopColor: colors.border }]}>
                      {!hasLookThrough ? (
                        <Text style={[styles.muted, { color: colors.muted }]}>
                          No published look-through for this scheme yet.
                        </Text>
                      ) : null}

                      {assetAllocation ? (
                        <View style={styles.block}>
                          <Text style={[styles.blockLabel, { color: colors.muted }]}>
                            Asset allocation
                          </Text>
                          <AssetAllocationBar allocation={assetAllocation} />
                          <View style={styles.allocationLabels}>
                            {allocationSlices(assetAllocation).map((slice) => (
                              <View key={slice.label} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                                <Text style={[styles.microText, { color: colors.muted }]}>
                                  {slice.label} {formatPercent(slice.percent)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ) : null}

                      {sectorWeightings.length > 0 ? (
                        <View style={styles.block}>
                          <Text style={[styles.blockLabel, { color: colors.muted }]}>
                            Sector weights
                          </Text>
                          {sectorWeightings
                            .slice()
                            .sort((a, b) => b.percentage - a.percentage)
                            .slice(0, 6)
                            .map((sector) => (
                              <View key={sector.sector} style={styles.weightRow}>
                                <Text
                                  style={[styles.weightName, { color: colors.textSecondary }]}
                                  numberOfLines={1}
                                >
                                  {sector.sector}
                                </Text>
                                <View
                                  style={[styles.weightTrack, { backgroundColor: colors.border }]}
                                >
                                  <View
                                    style={{
                                      width: `${Math.min(100, Math.max(0, sector.percentage))}%`,
                                      height: '100%',
                                      backgroundColor: color,
                                    }}
                                  />
                                </View>
                                <Text style={[styles.weightValue, numeric, { color: colors.muted }]}>
                                  {formatPercent(sector.percentage)}
                                </Text>
                              </View>
                            ))}
                        </View>
                      ) : null}

                      {subHoldings.length > 0 ? (
                        <View style={styles.block}>
                          <Text style={[styles.blockLabel, { color: colors.muted }]}>
                            Top underlying holdings
                          </Text>
                          {subHoldings.slice(0, 8).map((holding) => (
                            <View key={holding.name} style={styles.holdingRow}>
                              <Text
                                style={[styles.holdingName, { color: colors.textSecondary }]}
                                numberOfLines={1}
                              >
                                {holding.name}
                              </Text>
                              <Text style={[styles.holdingPercent, numeric, { color: colors.muted }]}>
                                {fund.value > 0
                                  ? formatPercent((holding.value / fund.value) * 100)
                                  : '—'}
                              </Text>
                              <Text style={[styles.holdingValue, numeric, { color: colors.textSecondary }]}>
                                {formatCompactINR(holding.value)}
                              </Text>
                            </View>
                          ))}
                          {subHoldings.length > 8 ? (
                            <Text style={[styles.muted, { color: colors.muted }]}>
                              +{subHoldings.length - 8} more reported holdings
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          {error ? (
            <Pressable onPress={onRetry} accessibilityRole="button" style={styles.retryRow}>
              <Feather name="refresh-cw" size={12} color={colors.warning} />
              <Text style={[styles.retryText, { color: colors.warning }]}>
                Some holdings could not be fetched. Tap to retry.
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </AnalyticsCard>
  );
}

interface AllocValue {
  stockPosition: number;
  bondPosition: number;
  cashPosition: number;
  otherPosition: number;
  preferredPosition: number;
  convertiblePosition: number;
}

function allocationSlices(allocation: AllocValue) {
  const equity = Number(allocation.stockPosition);
  const debt = Number(allocation.bondPosition);
  const cash = Number(allocation.cashPosition);
  const other =
    Number(allocation.otherPosition) +
    Number(allocation.preferredPosition ?? 0) +
    Number(allocation.convertiblePosition ?? 0);
  const total = equity + debt + cash + other;

  return [
    { label: 'Equity', value: equity, color: ALLOCATION_COLORS.Equity },
    { label: 'Debt', value: debt, color: ALLOCATION_COLORS.Debt },
    { label: 'Cash', value: cash, color: ALLOCATION_COLORS.Cash },
    { label: 'Other', value: other, color: ALLOCATION_COLORS.Other },
  ]
    .filter((slice) => slice.value > 0)
    .map((slice) => ({
      ...slice,
      percent: total > 0 ? (slice.value / total) * 100 : 0,
    }));
}

function AssetAllocationBar({ allocation }: { allocation: AllocValue }) {
  const { colors } = useTheme();
  const slices = allocationSlices(allocation);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return null;

  return (
    <View
      style={[styles.allocTrack, { backgroundColor: colors.border }]}
      accessibilityRole="image"
      accessibilityLabel="Fund asset allocation"
    >
      {slices.map((slice) => {
        const sliceValue = slice.value;
        return (
          <View
            key={slice.label}
            style={{ flex: sliceValue, backgroundColor: slice.color, height: '100%' }}
          />
        );
      })}
    </View>
  );
}

function mergeSubHoldings(constituents: FundSlice['constituents']) {
  const merged = new Map<string, { name: string; value: number }>();
  for (const constituent of constituents) {
    for (const holding of constituent.subHoldings) {
      const existing = merged.get(holding.name);
      if (existing) existing.value += holding.value;
      else merged.set(holding.name, { name: holding.name, value: holding.value });
    }
  }
  return [...merged.values()].sort((a, b) => b.value - a.value);
}

const fundColors = ['#D97706', '#2563EB', '#0D9488', '#7C3AED', '#DB2777', '#0EA5E9'];

const styles = StyleSheet.create({
  empty: { ...type.body, paddingVertical: space.xl, textAlign: 'center' },
  donutWrap: { alignItems: 'center' },
  donutValue: { fontSize: 18, fontWeight: '600', marginTop: 2 },
  rows: { gap: space.sm },
  rowCard: { borderRadius: radius.md, padding: space.md, gap: space.sm },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  fundName: { flex: 1, fontSize: 13, fontWeight: '600' },
  rowValueWrap: { alignItems: 'flex-end' },
  rowValue: { fontSize: 12, fontWeight: '600' },
  rowPercent: { fontSize: 10 },
  detail: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, gap: space.md },
  block: { gap: space.xs },
  blockLabel: { ...type.label, fontSize: 9, letterSpacing: 0.5 },
  allocTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
    marginTop: 2,
  },
  allocationLabels: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  microText: { fontSize: 10 },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 2 },
  weightName: { width: 112, fontSize: 11 },
  weightTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  weightValue: { width: 46, fontSize: 10, textAlign: 'right' },
  holdingRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 2 },
  holdingName: { flex: 1, fontSize: 11 },
  holdingPercent: { width: 46, fontSize: 10, textAlign: 'right' },
  holdingValue: { width: 64, fontSize: 10, textAlign: 'right' },
  muted: { fontSize: 10, lineHeight: 15 },
  retryRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.xs },
  retryText: { fontSize: 11, flex: 1 },
});
