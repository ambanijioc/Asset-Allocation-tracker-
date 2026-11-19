import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/src/components/ui/Badge';
import { Banner } from '@/src/components/ui/Banner';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { IconButton } from '@/src/components/ui/IconButton';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EmptyState, ErrorState } from '@/src/components/ui/States';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { usePortfolioData, useSaveAssets } from '@/src/features/portfolio/queries';
import {
  formatINR,
  formatPercent,
  formatQuantity,
  formatSignedINR,
} from '@/src/lib/format/money';
import { numeric, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

export default function AssetDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isDemo } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { savedAssets, summary, isLoading, error, refetch } = usePortfolioData();
  const saveMutation = useSaveAssets();
  const [deleting, setDeleting] = useState(false);

  const holding = summary.holdings.find((item) => item.asset.id === id);
  const asset = holding?.asset;
  const exchangeManaged =
    Boolean(asset) && !savedAssets.some((item) => item.id === asset?.id);

  const confirmDelete = () => {
    if (!asset || isDemo) return;
    Alert.alert(
      'Delete asset',
      `Remove ${asset.name} from your portfolio? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void handleDelete();
          },
        },
      ],
    );
  };

  const handleDelete = async () => {
    if (!asset) return;
    setDeleting(true);
    try {
      await saveMutation.mutateAsync(savedAssets.filter((item) => item.id !== asset.id));
      router.back();
    } catch (deleteError) {
      Alert.alert(
        'Delete failed',
        deleteError instanceof Error ? deleteError.message : 'Please try again.',
      );
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader
          title="Holding"
          action={<IconButton icon="x" onPress={() => router.back()} accessibilityLabel="Close" />}
        />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader
          title="Holding"
          action={<IconButton icon="x" onPress={() => router.back()} accessibilityLabel="Close" />}
        />
        <Card>
          <ErrorState
            message={error instanceof Error ? error.message : 'Could not load this holding.'}
            onRetry={refetch}
          />
        </Card>
      </Screen>
    );
  }

  if (!holding || !asset) {
    return (
      <Screen>
        <ScreenHeader
          title="Holding"
          action={<IconButton icon="x" onPress={() => router.back()} accessibilityLabel="Close" />}
        />
        <Card>
          <EmptyState
            icon="alert-circle"
            title="Asset not found"
            message="This holding may have been removed or changed on another device."
            actionLabel="Back to assets"
            onAction={() => router.back()}
          />
        </Card>
      </Screen>
    );
  }

  const unitPriceInr =
    asset.quantity > 0 ? holding.currentValue / 100 / asset.quantity : 0;
  const averagePriceInr =
    asset.quantity > 0 ? holding.investedValue / 100 / asset.quantity : 0;
  const positive = holding.pnl >= 0;
  const priced = holding.hasLivePrice;
  const pnlTone = priced ? (positive ? colors.positive : colors.negative) : colors.muted;
  const purchaseDate = asset.purchaseDate
    ? new Date(asset.purchaseDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
  const priceSource =
    exchangeManaged
      ? `${asset.exchange ?? 'Exchange'} balance`
      : asset.manualPrice != null
        ? 'Manual override'
        : holding.hasLivePrice
          ? 'Live market'
          : 'Average cost';

  return (
    <Screen>
      <View style={styles.navRow}>
        <IconButton icon="arrow-left" onPress={() => router.back()} accessibilityLabel="Go back" />
        <IconButton
          icon="edit-2"
          onPress={() => router.push(`/asset/${asset.id}/edit`)}
          accessibilityLabel="Edit asset"
          disabled={isDemo || exchangeManaged}
        />
      </View>

      <ScreenHeader title={asset.name} subtitle={`${asset.symbol} · ${holding.category}`} />

      <View style={styles.stack}>
        {isDemo ? (
          <Banner tone="warning" icon="eye" message="Demo holding — editing is disabled." />
        ) : null}
        {exchangeManaged ? (
          <Banner
            tone="info"
            icon="link"
            message={`This ${asset.exchange ?? 'exchange'} balance updates automatically and is read-only.`}
          />
        ) : null}

        <Card style={styles.hero}>
          <View style={styles.heroTop}>
            <Badge label={holding.category} tone="accent" />
            <Badge label={priceSource} tone={holding.hasLivePrice ? 'positive' : 'neutral'} />
          </View>
          <Text style={[styles.label, { color: colors.muted }]}>Current value</Text>
          <Text style={[styles.heroValue, numeric, { color: colors.text }]}>
            {formatINR(holding.currentValue)}
          </Text>
          <View style={styles.pnlRow}>
            <Feather
              name={priced ? (positive ? 'trending-up' : 'trending-down') : 'clock'}
              size={14}
              color={pnlTone}
            />
            <Text style={[styles.pnlText, numeric, { color: pnlTone }]}>
              {priced
                ? `${formatSignedINR(holding.pnl)} (${formatPercent(holding.pnlPercent, {
                    signed: true,
                  })})`
                : 'Cost basis · no live quote'}
            </Text>
          </View>
        </Card>

        <Card style={styles.rowsCard}>
          <Row label="Quantity" value={formatQuantity(asset.quantity)} />
          <Divider />
          <Row label="Average cost" value={formatINR(Math.round(averagePriceInr * 100), { exact: true })} />
          <Divider />
          <Row label="Current price" value={formatINR(Math.round(unitPriceInr * 100), { exact: true })} />
          <Divider />
          <Row label="Invested" value={formatINR(holding.investedValue)} />
          <Divider />
          <Row label="Current value" value={formatINR(holding.currentValue)} />
          <Divider />
          <Row
            label="Unrealised P&L"
            value={priced ? formatSignedINR(holding.pnl) : '—'}
            tone={pnlTone}
          />
        </Card>

        <Card style={styles.rowsCard}>
          <Row label="Category" value={holding.category} />
          <Divider />
          <Row label="Currency" value={asset.currency} />
          <Divider />
          <Row label="Purchased" value={purchaseDate} />
          <Divider />
          <Row label="Price source" value={priceSource} />
          {asset.manualPrice != null ? (
            <>
              <Divider />
              <Row
                label="Manual price"
                value={formatINR(Math.round(asset.manualPrice * 100), { exact: true })}
              />
            </>
          ) : null}
        </Card>

        {!exchangeManaged ? (
          <>
            <Button
              label="Edit holding"
              onPress={() => router.push(`/asset/${asset.id}/edit`)}
              variant="secondary"
              icon="edit-2"
              fullWidth
              disabled={isDemo}
            />
            <Button
              label="Delete holding"
              onPress={confirmDelete}
              variant="danger"
              icon="trash-2"
              fullWidth
              loading={deleting}
              disabled={isDemo}
            />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[type.body, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, numeric, { color: tone ?? colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.sm,
  },
  stack: { gap: space.lg },
  hero: { gap: space.xs },
  heroTop: { flexDirection: 'row', gap: space.sm, marginBottom: space.sm, flexWrap: 'wrap' },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroValue: { fontSize: 32, fontWeight: '600', letterSpacing: -0.8, marginTop: 2 },
  pnlRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  pnlText: { fontSize: 13, fontWeight: '600' },
  rowsCard: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  rowValue: { fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth },
});
