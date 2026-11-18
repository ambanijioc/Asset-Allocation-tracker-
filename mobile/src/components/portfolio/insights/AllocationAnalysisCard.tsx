import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, type BadgeTone } from '@/src/components/ui/Badge';
import type { AllocationNode } from '@/src/features/portfolio/analytics';
import { normalizeGroup } from '@/src/features/portfolio/normalize';
import type {
  PolicyEvaluation,
  PolicySleeveEvaluation,
} from '@/src/features/portfolio/policy';
import {
  formatCompactINR,
  formatDriftPp,
  formatPercent,
} from '@/src/lib/format/money';
import { numeric, radius, space, type } from '@/src/lib/theme/tokens';
import { useTheme } from '@/src/lib/theme/ThemeProvider';

import { AnalyticsCard } from './AnalyticsCard';

interface AllocationAnalysisCardProps {
  nodes: AllocationNode[];
  total: number;
  policy: PolicyEvaluation;
  policyVersion: number;
}

/**
 * Current-vs-target allocation tree. Rows drill into sub-categories and then
 * into the underlying holdings that make up each bucket. Tolerance bands are
 * evaluated at root sleeves only; children are composition detail.
 */
export function AllocationAnalysisCard({
  nodes,
  total,
  policy,
  policyVersion,
}: AllocationAnalysisCardProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (path: string) =>
    setExpanded((current) => ({ ...current, [path]: !current[path] }));

  const sleeveByPath = new Map(policy.sleeves.map((sleeve) => [sleeve.path, sleeve]));
  const actionable = !policy.isTemplate && policy.isValid;

  return (
    <AnalyticsCard
      icon="target"
      title="Asset Allocation Analysis"
      subtitle="Current weight versus policy target"
      tint="#059669"
      tintSoft="rgba(5, 150, 105, 0.12)"
      trailing={
        <Badge
          label={policy.isTemplate ? 'Template' : `Policy v${policyVersion}`}
          tone={policy.isTemplate ? 'neutral' : 'accent'}
        />
      }
      footer={
        <Text style={[styles.footerText, { color: colors.muted }]}>
          {policy.isTemplate
            ? 'No confirmed policy — drift is compared with the default target template.'
            : 'Bands apply to root sleeves only. Sub-sleeves show composition against target.'}
        </Text>
      }
    >
      {nodes.length === 0 ? (
        <Text style={[styles.empty, { color: colors.muted }]}>
          Add assets to compare current allocation with your target.
        </Text>
      ) : (
        <>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.currentSwatch, { backgroundColor: colors.accent }]} />
              <Text style={[styles.legendText, { color: colors.muted }]}>Current</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.targetMarker, { backgroundColor: colors.text }]} />
              <Text style={[styles.legendText, { color: colors.muted }]}>Target</Text>
            </View>
            <Text style={[styles.legendText, { color: colors.muted }]}>Drift in pp</Text>
          </View>

          <View style={styles.tree}>
            {nodes.map((node) => (
              <AllocationRow
                key={node.fullPath}
                node={node}
                depth={0}
                scale={100}
                total={total}
                expanded={expanded}
                onToggle={toggle}
                sleeve={sleeveByPath.get(normalizeGroup(node.fullPath))}
                actionable={actionable}
              />
            ))}
          </View>
        </>
      )}
    </AnalyticsCard>
  );
}

interface AllocationRowProps {
  node: AllocationNode;
  depth: number;
  scale: number;
  total: number;
  expanded: Record<string, boolean>;
  onToggle: (path: string) => void;
  sleeve?: PolicySleeveEvaluation;
  actionable: boolean;
}

function AllocationRow({
  node,
  depth,
  scale,
  total,
  expanded,
  onToggle,
  sleeve,
  actionable,
}: AllocationRowProps) {
  const { colors } = useTheme();
  const isOpen = Boolean(expanded[node.fullPath]);
  const hasChildren = node.subCategories.length > 0;
  const hasConstituents = node.constituents.length > 0;
  const expandable = hasChildren || hasConstituents;

  const hasTarget = node.idealPercentage > 0;
  const band = depth === 0 ? sleeve : undefined;
  const badgeTone: BadgeTone = !band || !actionable
    ? 'neutral'
    : band.status === 'within'
      ? 'positive'
      : band.status === 'watch'
        ? 'warning'
        : 'negative';
  const badgeLabel = band
    ? formatDriftPp(band.driftPp, { signed: true })
    : hasTarget
      ? formatDriftPp(node.diffPercentage, { signed: true })
      : null;
  const fillColor =
    band && actionable
      ? band.status === 'within'
        ? colors.positive
        : band.status === 'watch'
          ? colors.warning
          : colors.negative
      : colors.accent;

  const currentWidth = Math.min(100, Math.max(0, (node.currentPercentage / scale) * 100));
  const targetWidth = Math.min(100, Math.max(0, (node.idealPercentage / scale) * 100));
  const childScale = Math.max(node.currentPercentage, node.idealPercentage, 5);

  return (
    <View style={styles.node}>
      <Pressable
        onPress={() => onToggle(node.fullPath)}
        disabled={!expandable}
        accessibilityRole={expandable ? 'button' : undefined}
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${node.category}, current ${formatPercent(
          node.currentPercentage,
        )}, target ${formatPercent(node.idealPercentage)}${
          band ? `, ${formatDriftPp(band.driftPp, { signed: true })} against a ±${band.bandPp} pp band` : ''
        }`}
        style={[
          styles.row,
          {
            paddingLeft: space.sm + depth * space.lg,
            backgroundColor: depth === 0 ? 'transparent' : colors.cardMuted,
          },
        ]}
      >
        <View style={styles.rowTop}>
          <Feather
            name={expandable ? (isOpen ? 'chevron-down' : 'chevron-right') : 'circle'}
            size={expandable ? 13 : 4}
            color={expandable ? colors.muted : colors.border}
          />
          <Text
            style={[
              styles.category,
              { color: colors.text },
              depth === 0 && styles.rootCategory,
            ]}
            numberOfLines={1}
          >
            {node.category}
          </Text>
          {badgeLabel ? <Badge label={badgeLabel} tone={badgeTone} /> : null}
          <Text style={[styles.amount, numeric, { color: colors.muted }]}>
            {formatCompactINR(node.currentValue)}
          </Text>
        </View>

        <View style={styles.metrics}>
          <Text style={[styles.metricLabel, { color: colors.muted }]}>CURRENT</Text>
          <Text style={[styles.metricValue, numeric, { color: colors.text }]}>
            {formatPercent(node.currentPercentage)}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.muted }]}>TARGET</Text>
          <Text style={[styles.metricValue, numeric, { color: colors.textSecondary }]}>
            {hasTarget ? formatPercent(node.idealPercentage) : '—'}
          </Text>
          {band ? (
            <>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>BAND</Text>
              <Text style={[styles.metricValue, numeric, { color: colors.textSecondary }]}>
                ±{band.bandPp} pp
              </Text>
            </>
          ) : null}
        </View>

        <View style={[styles.barTrack, { backgroundColor: colors.cardMuted }]}>
          <View
            style={{
              width: `${currentWidth}%`,
              height: '100%',
              borderRadius: radius.full,
              backgroundColor: fillColor,
            }}
          />
          {hasTarget ? (
            <View
              style={[
                styles.targetLine,
                { left: `${Math.min(99, targetWidth)}%`, backgroundColor: colors.text },
              ]}
            />
          ) : null}
        </View>
      </Pressable>

      {isOpen ? (
        <View style={styles.children}>
          {node.subCategories.map((child) => (
            <AllocationRow
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              scale={childScale}
              total={total}
              expanded={expanded}
              onToggle={onToggle}
              actionable={actionable}
            />
          ))}

          {node.constituents.length > 0 ? (
            <View
              style={[
                styles.constituents,
                { paddingLeft: space.lg + (depth + 1) * space.lg, borderLeftColor: colors.border },
              ]}
            >
              <Text style={[styles.constituentLabel, { color: colors.muted }]}>
                Holdings in {node.category}
              </Text>
              {node.constituents
                .slice()
                .sort((a, b) => b.value - a.value)
                .map((constituent) => (
                  <View key={`${constituent.symbol}-${constituent.value}`} style={styles.constituentRow}>
                    <Text
                      style={[styles.constituentName, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {constituent.name}
                    </Text>
                    <Text style={[styles.constituentShare, numeric, { color: colors.muted }]}>
                      {total > 0 ? formatPercent((constituent.value / total) * 100) : '—'}
                    </Text>
                    <Text style={[styles.constituentValue, numeric, { color: colors.textSecondary }]}>
                      {formatCompactINR(constituent.value)}
                    </Text>
                  </View>
                ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { ...type.body, paddingVertical: space.xl, textAlign: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  currentSwatch: { width: 14, height: 4, borderRadius: 2 },
  targetMarker: { width: 2, height: 10, borderRadius: 1 },
  legendText: { fontSize: 10 },
  tree: { gap: space.xs },
  node: { gap: space.xs },
  row: { borderRadius: radius.md, paddingVertical: space.sm, paddingRight: space.sm, gap: 5 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  category: { flex: 1, fontSize: 12, fontWeight: '500' },
  rootCategory: { fontSize: 13, fontWeight: '600' },
  amount: { fontSize: 10 },
  metrics: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingLeft: 17 },
  metricLabel: { ...type.label, fontSize: 8, letterSpacing: 0.4 },
  metricValue: { fontSize: 10, fontWeight: '600', marginRight: space.sm },
  barTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
    marginLeft: 17,
    marginTop: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  targetLine: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  children: { gap: space.xs },
  constituents: {
    borderLeftWidth: 1,
    paddingLeft: space.md,
    marginLeft: space.lg,
    paddingVertical: space.xs,
    gap: 3,
  },
  constituentLabel: { ...type.label, fontSize: 8, letterSpacing: 0.4, marginBottom: 2 },
  constituentRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  constituentName: { flex: 1, fontSize: 10 },
  constituentShare: { width: 46, fontSize: 9, textAlign: 'right' },
  constituentValue: { width: 62, fontSize: 9, textAlign: 'right' },
  footerText: { fontSize: 10, lineHeight: 15 },
});
