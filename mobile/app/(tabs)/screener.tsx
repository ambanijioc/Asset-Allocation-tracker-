import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badge';
import { Banner } from '@/src/components/ui/Banner';
import { Card } from '@/src/components/ui/Card';
import { Chip } from '@/src/components/ui/Chip';
import { IconButton } from '@/src/components/ui/IconButton';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/src/components/ui/States';
import { useScreener } from '@/src/features/portfolio/queries';
import type { ScreenerFilters, ScreenerStock } from '@/src/features/portfolio/types';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { formatMarketCap } from '@/src/lib/format/money';
import { numeric, radius, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

type CapPreset = 'all' | '1k' | '10k' | '50k';
type PePreset = 'any' | '20' | '30' | '50';
type YieldPreset = 'any' | '1' | '2';
type SortKey = 'marketCap' | 'peRatio' | 'divYield';

/** Values are millions of INR, matching the screener API contract. */
const CAP_OPTIONS: { key: CapPreset; label: string; value: number }[] = [
  { key: 'all', label: 'All caps', value: 0 },
  { key: '1k', label: '> ₹1K Cr', value: 10_000 },
  { key: '10k', label: '> ₹10K Cr', value: 100_000 },
  { key: '50k', label: '> ₹50K Cr', value: 500_000 },
];

const PE_OPTIONS: { key: PePreset; label: string }[] = [
  { key: 'any', label: 'Any P/E' },
  { key: '20', label: 'P/E < 20' },
  { key: '30', label: 'P/E < 30' },
  { key: '50', label: 'P/E < 50' },
];

const YIELD_OPTIONS: { key: YieldPreset; label: string }[] = [
  { key: 'any', label: 'Any yield' },
  { key: '1', label: 'Yield > 1%' },
  { key: '2', label: 'Yield > 2%' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'marketCap', label: 'Market cap' },
  { key: 'peRatio', label: 'P/E' },
  { key: 'divYield', label: 'Dividend yield' },
];

export default function ScreenerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isDemo } = useAuth();

  const [cap, setCap] = useState<CapPreset>('all');
  const [maxPe, setMaxPe] = useState<PePreset>('any');
  const [minYield, setMinYield] = useState<YieldPreset>('any');
  const [sort, setSort] = useState<SortKey>('marketCap');

  const filters = useMemo<ScreenerFilters>(() => {
    const list: ScreenerFilters['filters'] = [{ id: 'marketCap', op: 'gt', val: 0 }];
    const minMarketCap = CAP_OPTIONS.find((option) => option.key === cap)?.value ?? 0;
    if (minMarketCap > 0) list.push({ id: 'marketCap', op: 'gt', val: minMarketCap });
    if (maxPe !== 'any') list.push({ id: 'peRatio', op: 'lt', val: Number(maxPe) });
    if (minYield !== 'any') list.push({ id: 'divYield', op: 'gt', val: Number(minYield) });

    return {
      filters: list,
      sort,
      order: sort === 'peRatio' ? 1 : -1,
      limit: 25,
    };
  }, [cap, maxPe, minYield, sort]);

  const { data, isLoading, isFetching, error, refetch } = useScreener(filters);

  return (
    <Screen refreshing={isFetching && !isLoading} onRefresh={refetch}>
      <ScreenHeader
        title="Screener"
        subtitle="Filter Indian equities by size, valuation and yield"
        action={
          <IconButton
            icon="refresh-cw"
            onPress={refetch}
            disabled={isDemo}
            accessibilityLabel={isDemo ? 'Refresh screener — unavailable in demo' : 'Refresh screener'}
          />
        }
      />

      <View style={styles.stack}>
        {isDemo ? (
          <Banner
            tone="warning"
            icon="eye"
            message="Read-only demo — results use a bundled market snapshot. Sign in to add stocks to your portfolio."
          />
        ) : null}

        <Card style={styles.filterCard}>
          <FilterRow label="Market cap">
            {CAP_OPTIONS.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                selected={cap === option.key}
                onPress={() => setCap(option.key)}
              />
            ))}
          </FilterRow>

          <FilterRow label="Valuation">
            {PE_OPTIONS.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                selected={maxPe === option.key}
                onPress={() => setMaxPe(option.key)}
              />
            ))}
          </FilterRow>

          <FilterRow label="Dividend">
            {YIELD_OPTIONS.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                selected={minYield === option.key}
                onPress={() => setMinYield(option.key)}
              />
            ))}
          </FilterRow>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <FilterRow label="Sort by">
            {SORT_OPTIONS.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                selected={sort === option.key}
                onPress={() => setSort(option.key)}
              />
            ))}
          </FilterRow>
        </Card>

        {error ? (
          <Card>
            <ErrorState
              title="Screener unavailable"
              message={
                error instanceof Error
                  ? error.message
                  : 'The market data provider did not respond. Try again in a moment.'
              }
              onRetry={refetch}
            />
          </Card>
        ) : isLoading ? (
          <View style={styles.skeletonStack}>
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} height={84} borderRadius={16} />
            ))}
          </View>
        ) : !data || data.length === 0 ? (
          <Card>
            <EmptyState
              icon="filter"
              title="No matching stocks"
              message="Loosen a filter or change the sort order to see more companies."
            />
          </Card>
        ) : (
          <Card padded={false} style={styles.resultsCard}>
            {data.map((stock, index) => (
              <View key={stock.sid}>
                {index > 0 ? (
                  <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                ) : null}
                <ScreenerRow
                  stock={stock}
                  onPress={
                    isDemo
                      ? undefined
                      : () =>
                          router.push({
                            pathname: '/asset/new',
                            params: {
                              name: stock.name,
                              symbol: `${stock.ticker}.NS`,
                              type: 'STOCK',
                            },
                          })
                  }
                />
              </View>
            ))}
          </Card>
        )}

        <Text style={[styles.source, { color: colors.muted }]}>
          {data?.length ?? 0} results · {isDemo ? 'bundled demo snapshot' : 'market data via Tickertape'}
        </Text>
      </View>
    </Screen>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.filterRow}>
      <Text style={[type.label, { color: colors.muted }]}>{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

function ScreenerRow({ stock, onPress }: { stock: ScreenerStock; onPress?: () => void }) {
  const { colors } = useTheme();
  const metrics = [
    { label: 'MCap', value: formatMarketCap(stock.marketCap) },
    { label: 'P/E', value: stock.peRatio != null ? stock.peRatio.toFixed(1) : '—' },
    { label: 'Yield', value: stock.divYield != null ? `${stock.divYield.toFixed(2)}%` : '—' },
  ];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${stock.name}${onPress ? '. Add to portfolio' : ''}`}
      accessibilityState={{ disabled: !onPress }}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null]}
    >
      <View style={styles.rowTop}>
        <View style={[styles.tickerBox, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.ticker, { color: colors.accent }]} numberOfLines={1}>
            {stock.ticker}
          </Text>
        </View>
        <View style={styles.identity}>
          <Text style={[type.bodyMedium, { color: colors.text }]} numberOfLines={1}>
            {stock.name}
          </Text>
          <Text style={[styles.sector, { color: colors.muted }]} numberOfLines={1}>
            {stock.sector ?? 'Other'}
          </Text>
        </View>
        {onPress ? (
          <Feather name="plus-circle" size={19} color={colors.accent} />
        ) : null}
      </View>
      <View style={styles.metrics}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>{metric.label}</Text>
            <Text style={[styles.metricValue, numeric, { color: colors.textSecondary }]}>
              {metric.value}
            </Text>
          </View>
        ))}
        {stock.marketCap && stock.marketCap >= 100_000 ? (
          <Badge label="Large cap" tone="accent" />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  filterCard: { gap: space.lg },
  filterRow: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: -space.xs },
  resultsCard: { overflow: 'hidden' },
  row: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  tickerBox: {
    minWidth: 54,
    height: 30,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticker: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  identity: { flex: 1, gap: 1 },
  sector: { fontSize: 11 },
  metrics: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  metric: { gap: 1 },
  metricLabel: { fontSize: 10 },
  metricValue: { fontSize: 12, fontWeight: '600' },
  rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: space.lg },
  pressed: { opacity: 0.65 },
  skeletonStack: { gap: space.sm },
  source: { fontSize: 11, textAlign: 'center' },
});
