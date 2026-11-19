import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { PortfolioLoadProgress } from '@/src/features/portfolio/queries';
import { numeric, radius, space, type } from '@/src/lib/theme/tokens';
import type { Palette } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

import { Card } from './Card';

interface LoadingProgressProps {
  progress: PortfolioLoadProgress;
  /** Slim, chrome-less version for refreshes that do not block the screen. */
  compact?: boolean;
}

/** Rendered whenever a first load is still in flight. */
const SNAPSHOT_BUDGET_MS = 40_000;

export function LoadingProgress({ progress, compact = false }: LoadingProgressProps) {
  const { colors } = useTheme();
  const [elapsedMs, setElapsedMs] = useState(0);

  const timingSnapshot = progress.active && progress.stage === 'snapshot';

  useEffect(() => {
    if (!timingSnapshot) return;
    const startedAt = progress.startedAt ?? Date.now();
    const update = () => setElapsedMs(Math.max(0, Date.now() - startedAt));
    update();
    const timer = setInterval(update, 1_000);
    return () => clearInterval(timer);
  }, [timingSnapshot, progress.startedAt]);

  if (!progress.active) return null;

  const { percent, label, detail } = describe(progress, elapsedMs);

  return (
    <View
      style={
        compact
          ? [
              styles.compact,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]
          : undefined
      }
    >
      {compact ? (
        <ProgressContent
          percent={percent}
          label={label}
          detail={detail}
          colors={colors}
        />
      ) : (
        <Card style={styles.card}>
          <ProgressContent
            percent={percent}
            label={label}
            detail={detail}
            colors={colors}
          />
        </Card>
      )}
    </View>
  );
}

interface ProgressContentProps {
  percent: number;
  label: string;
  detail: string;
  colors: Palette;
}

function ProgressContent({ percent, label, detail, colors }: ProgressContentProps) {
  return (
    <>
      <View style={styles.header}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[type.bodyMedium, styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[type.caption, numeric, styles.percent, { color: colors.muted }]}>
          {percent}%
        </Text>
      </View>

      <View
        style={[styles.track, { backgroundColor: colors.cardMuted }]}
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
      >
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: colors.accent }]} />
      </View>

      <Text style={[type.caption, styles.detail, { color: colors.muted }]}>{detail}</Text>
    </>
  );
}

function describe(progress: PortfolioLoadProgress, elapsedMs: number) {
  if (progress.stage === 'snapshot') {
    // The server wake-up has no real progress events, so ease towards 45% over
    // the expected budget. The copy carries the honest time estimate.
    const percent = Math.max(
      4,
      Math.min(45, Math.round(45 * (1 - Math.exp(-elapsedMs / 15_000)))),
    );
    const elapsedSeconds = Math.floor(elapsedMs / 1_000);
    const remainingSeconds = Math.max(
      0,
      Math.ceil((SNAPSHOT_BUDGET_MS - elapsedMs) / 1_000),
    );

    if (elapsedSeconds < 6) {
      return {
        percent,
        label: 'Loading your portfolio',
        detail: 'Checking your saved holdings…',
      };
    }

    return {
      percent,
      label: 'Waking up the server',
      detail:
        remainingSeconds > 0
          ? `The backend was idle · about ${remainingSeconds}s left`
          : 'Taking longer than usual — still working…',
    };
  }

  if (progress.stage === 'prices') {
    const fundsPending =
      progress.fundsTotal > 0 && progress.fundsCompleted < progress.fundsTotal;
    return {
      percent: stagePercent(progress),
      label: 'Fetching live prices',
      detail: fundsPending
        ? `Quotes and ${progress.fundsTotal} fund look-throughs in progress…`
        : 'Updating the latest quotes for your holdings…',
    };
  }

  return {
    percent: stagePercent(progress),
    label: 'Loading fund look-through',
    detail:
      progress.fundsTotal > 0
        ? `${progress.fundsCompleted} of ${progress.fundsTotal} funds loaded`
        : 'Finishing up…',
  };
}

/**
 * Snapshot = 50%, prices = 25%, fund look-through = the remaining 25%.
 * Everything runs on first load; later loads only fill the missing stages.
 */
function stagePercent(progress: PortfolioLoadProgress): number {
  let percent = 50;
  if (progress.pricesDone) percent += 25;
  percent +=
    progress.fundsTotal > 0
      ? Math.round((25 * progress.fundsCompleted) / progress.fundsTotal)
      : 25;
  return Math.min(99, percent);
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  compact: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { flex: 1 },
  percent: { fontWeight: '600' },
  track: { height: 6, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
  detail: { lineHeight: 16 },
});
