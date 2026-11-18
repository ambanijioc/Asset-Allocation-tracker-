import type { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { BadgeTone } from '@/src/components/ui/Badge';
import type { PolicyEvaluation } from '@/src/features/portfolio/policy';
import { formatPercent } from '@/src/lib/format/money';

export interface PolicyStatusView {
  badgeLabel: string;
  badgeTone: BadgeTone;
  headline: string;
  hint: string;
  icon: ComponentProps<typeof Feather>['name'];
  tone: 'neutral' | 'positive' | 'negative';
}

/** One vocabulary for policy state across the dashboard, allocation and settings. */
export function policyStatusView(evaluation: PolicyEvaluation): PolicyStatusView {
  switch (evaluation.status) {
    case 'template':
      return {
        badgeLabel: 'Template',
        badgeTone: 'neutral',
        headline: 'Set policy',
        hint: 'Default target template',
        icon: 'target',
        tone: 'neutral',
      };
    case 'invalid':
      return {
        badgeLabel: 'Needs attention',
        badgeTone: 'warning',
        headline: 'Fix targets',
        hint: `Targets total ${formatPercent(evaluation.targetSum)}`,
        icon: 'alert-circle',
        tone: 'neutral',
      };
    case 'unmanaged':
      return {
        badgeLabel: 'No targets',
        badgeTone: 'warning',
        headline: 'Unmanaged',
        hint: 'Assign sleeve targets',
        icon: 'target',
        tone: 'neutral',
      };
    case 'breach':
      return {
        badgeLabel: 'Drift',
        badgeTone: 'negative',
        headline: `${evaluation.breachCount} outside band`,
        hint: `${evaluation.inToleranceCount}/${evaluation.targetedCount} in tolerance`,
        icon: 'alert-triangle',
        tone: 'negative',
      };
    case 'watch':
      return {
        badgeLabel: 'Watch',
        badgeTone: 'warning',
        headline: `${evaluation.watchCount} near band`,
        hint: `${evaluation.inToleranceCount}/${evaluation.targetedCount} in tolerance`,
        icon: 'alert-circle',
        tone: 'neutral',
      };
    case 'on-policy':
    default:
      return {
        badgeLabel: 'Aligned',
        badgeTone: 'positive',
        headline: 'On policy',
        hint: `${evaluation.inToleranceCount}/${evaluation.targetedCount} in tolerance`,
        icon: 'check-circle',
        tone: 'positive',
      };
  }
}
