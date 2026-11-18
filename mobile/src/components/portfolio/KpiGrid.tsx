import { StyleSheet, View } from 'react-native';

import type { PortfolioSummary } from '@/src/features/portfolio/aggregate';
import type { PolicyEvaluation } from '@/src/features/portfolio/policy';
import { formatCompactINR, formatPercent } from '@/src/lib/format/money';
import { space } from '@/src/lib/theme/tokens';

import { StatCard } from '../ui/StatCard';
import { policyStatusView } from './policyStatus';

interface KpiGridProps {
  summary: PortfolioSummary;
  policy: PolicyEvaluation;
  policyReadOnly?: boolean;
  onPolicyPress: () => void;
}

/** The same four KPIs as the web dashboard, laid out for thumbs. */
export function KpiGrid({
  summary,
  policy,
  policyReadOnly = false,
  onPolicyPress,
}: KpiGridProps) {
  const positive = summary.pnl >= 0;
  const policyStatus = policyStatusView(policy);
  const policyHeadline =
    policyReadOnly && policy.isTemplate ? 'Template' : policyStatus.headline;
  const policyHint =
    policyReadOnly && policy.isTemplate ? 'Read-only in demo' : policyStatus.hint;

  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <StatCard
          label="Current value"
          value={formatCompactINR(summary.currentValue)}
          hint={`${summary.assetCount} ${summary.assetCount === 1 ? 'asset' : 'assets'}`}
          icon="pie-chart"
        />
        <StatCard
          label="Invested"
          value={formatCompactINR(summary.investedValue)}
          hint={`${summary.categories} categories`}
          icon="briefcase"
        />
      </View>
      <View style={styles.row}>
        <StatCard
          label="Total P&L"
          value={`${positive ? '+' : '-'}${formatCompactINR(Math.abs(summary.pnl))}`}
          badgeLabel={formatPercent(summary.pnlPercent, { signed: true })}
          badgeTone={positive ? 'positive' : 'negative'}
          tone={positive ? 'positive' : 'negative'}
          icon={positive ? 'trending-up' : 'trending-down'}
        />
        <StatCard
          label="Policy"
          value={policyHeadline}
          hint={policyHint}
          badgeLabel={policyStatus.badgeLabel}
          badgeTone={policyStatus.badgeTone}
          tone={policyStatus.tone}
          icon={policyStatus.icon}
          onPress={onPolicyPress}
          accessibilityLabel={`Allocation policy: ${policyHeadline}. ${policyHint}.`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
});
