import {
  statusForDrift,
  type PolicyEvaluation,
  type PolicySleeveEvaluation,
  type PolicyStatus,
} from './policy';

/**
 * Rebalance planning is contribution-first:
 *
 * 1. New money is allocated to underweight sleeves, largest gap first, until
 *    the contribution is exhausted or every sleeve reaches its target.
 * 2. If the user allows trims and a sleeve would still be outside its band,
 *    overweight sleeves are sold back to target and the proceeds fund the
 *    remaining gaps.
 *
 * Targets and drift are expressed against the whole portfolio, including
 * holdings outside policy. That keeps the projection consistent with the
 * health card and makes unmanaged value visible as a gap the plan cannot close
 * by itself.
 */
export type RebalancePlanStatus =
  | 'no-targets'
  | 'no-action'
  | 'idle'
  | 'fund'
  | 'trim'
  | 'fund-and-trim';

export interface RebalanceProjectionRow {
  path: string;
  label: string;
  color: string;
  targetPercentage: number;
  bandPp: number;
  currentPercentage: number;
  projectedPercentage: number;
  currentDriftPp: number;
  projectedDriftPp: number;
  projectedStatus: PolicyStatus;
  currentValue: number;
  projectedValue: number;
  buyAmount: number;
  sellAmount: number;
}

export interface RebalanceSummary {
  worstDriftPp: number;
  breachCount: number;
  watchCount: number;
  withinCount: number;
  inToleranceCount: number;
}

export interface RebalancePlan {
  status: RebalancePlanStatus;
  rows: RebalanceProjectionRow[];
  buys: RebalanceProjectionRow[];
  sells: RebalanceProjectionRow[];
  contribution: number;
  totalBuy: number;
  totalSell: number;
  afterTotal: number;
  before: RebalanceSummary;
  /** Projection after new money, before any trims. */
  afterContribution: RebalanceSummary;
  /** Final projection after the proposed trades. */
  after: RebalanceSummary;
  /** Sleeve deficits still open after the proposed trades. */
  unfundedGap: number;
  /** Current sleeve deficits and excess, before any trades. */
  underweightGap: number;
  overweightGap: number;
  /** Value that belongs to the portfolio but not to any policy sleeve. */
  outsidePolicy: number;
  /** Extra cash held above target to respect the policy's reserve floor. */
  cashFloorHeld: number;
  /** True when at least one overweight sleeve is sold in the plan. */
  trimsApplied: boolean;
}

export interface RebalancePlanInput {
  evaluation: PolicyEvaluation;
  /** New money to invest, in paise. */
  contribution: number;
  /** Allow selling overweight sleeves when new money alone leaves a breach. */
  trimOverweight: boolean;
  /** Cash reserve floor from the policy, in percentage points. */
  minCashPct: number;
}

interface MutableRow {
  sleeve: PolicySleeveEvaluation;
  value: number;
  buy: number;
  sell: number;
}

function summaryOf(sleeves: PolicySleeveEvaluation[]): RebalanceSummary {
  const breachCount = sleeves.filter((sleeve) => sleeve.status === 'breach').length;
  const watchCount = sleeves.filter((sleeve) => sleeve.status === 'watch').length;
  const withinCount = sleeves.filter((sleeve) => sleeve.status === 'within').length;
  return {
    breachCount,
    watchCount,
    withinCount,
    inToleranceCount: withinCount + watchCount,
    worstDriftPp: sleeves.reduce(
      (worst, sleeve) => Math.max(worst, Math.abs(sleeve.driftPp)),
      0,
    ),
  };
}

function summaryOfRows(rows: RebalanceProjectionRow[]): RebalanceSummary {
  return {
    breachCount: rows.filter((row) => row.projectedStatus === 'breach').length,
    watchCount: rows.filter((row) => row.projectedStatus === 'watch').length,
    withinCount: rows.filter((row) => row.projectedStatus === 'within').length,
    inToleranceCount: rows.filter((row) => row.projectedStatus !== 'breach').length,
    worstDriftPp: rows.reduce(
      (worst, row) => Math.max(worst, Math.abs(row.projectedDriftPp)),
      0,
    ),
  };
}

function createRows(
  states: MutableRow[],
  total: number,
): RebalanceProjectionRow[] {
  return states.map(({ sleeve, value, buy, sell }) => {
    const projectedPercentage = total > 0 ? (value / total) * 100 : 0;
    const projectedDriftPp = projectedPercentage - sleeve.targetPercentage;
    return {
      path: sleeve.path,
      label: sleeve.label,
      color: sleeve.color,
      targetPercentage: sleeve.targetPercentage,
      bandPp: sleeve.bandPp,
      currentPercentage: sleeve.currentPercentage,
      currentDriftPp: sleeve.driftPp,
      projectedPercentage,
      projectedDriftPp,
      projectedStatus: statusForDrift(projectedDriftPp, sleeve.bandPp),
      currentValue: sleeve.currentValue,
      projectedValue: value,
      buyAmount: buy,
      sellAmount: sell,
    };
  });
}

function targetValue(sleeve: PolicySleeveEvaluation, total: number): number {
  return total * (sleeve.targetPercentage / 100);
}

/** Deficits below target, largest first. */
function deficitsOf(
  states: MutableRow[],
  total: number,
): { state: MutableRow; gap: number }[] {
  return states
    .map((state) => ({
      state,
      gap: targetValue(state.sleeve, total) - state.value,
    }))
    .filter((entry) => entry.gap > 0.5)
    .sort((a, b) => b.gap - a.gap);
}

/** Fund deficits in order until the amount runs out. */
function fundDeficits(
  states: MutableRow[],
  total: number,
  amount: number,
): number {
  let remaining = amount;
  for (const deficit of deficitsOf(states, total)) {
    if (remaining <= 0.5) break;
    const allocation = Math.min(deficit.gap, remaining);
    deficit.state.value += allocation;
    deficit.state.buy += allocation;
    remaining -= allocation;
  }
  return Math.max(0, remaining);
}

export function planRebalance(input: RebalancePlanInput): RebalancePlan {
  const { evaluation, trimOverweight, minCashPct } = input;
  const contribution = Number.isFinite(input.contribution)
    ? Math.max(0, input.contribution)
    : 0;
  const total = Math.max(0, evaluation.totalValue);
  const afterTotal = total + contribution;
  const outsidePolicy = evaluation.unmanaged.reduce(
    (sum, slice) => sum + slice.currentValue,
    0,
  );
  const before = summaryOf(evaluation.sleeves);
  const underweightGap = evaluation.sleeves.reduce(
    (sum, sleeve) =>
      sum + Math.max(0, targetValue(sleeve, total) - sleeve.currentValue),
    0,
  );
  const overweightGap = evaluation.sleeves.reduce(
    (sum, sleeve) =>
      sum + Math.max(0, sleeve.currentValue - targetValue(sleeve, total)),
    0,
  );
  const states: MutableRow[] = evaluation.sleeves.map((sleeve) => ({
    sleeve,
    value: sleeve.currentValue,
    buy: 0,
    sell: 0,
  }));

  if (evaluation.isTemplate || !evaluation.isValid || evaluation.targetedCount === 0) {
    const rows = createRows(states, total);
    return {
      status: 'no-targets',
      rows,
      buys: [],
      sells: [],
      contribution,
      totalBuy: 0,
      totalSell: 0,
      afterTotal,
      before,
      afterContribution: before,
      after: before,
      unfundedGap: 0,
      underweightGap,
      overweightGap,
      outsidePolicy,
      cashFloorHeld: 0,
      trimsApplied: false,
    };
  }

  // 1. New money funds the largest gaps first. If every sleeve can be brought
  //    to target and money is still left, invest it by target weight.
  let remaining = contribution;
  if (remaining > 0.5) {
    remaining = fundDeficits(states, afterTotal, remaining);
    if (remaining > 0.5) {
      const targetSum = states.reduce(
        (sum, state) => sum + Math.max(0, state.sleeve.targetPercentage),
        0,
      );
      for (const state of states) {
        if (targetSum <= 0) break;
        const allocation = remaining * (state.sleeve.targetPercentage / targetSum);
        state.value += allocation;
        state.buy += allocation;
      }
    }
  }

  const afterContributionRows = createRows(states, afterTotal);
  const afterContribution = summaryOfRows(afterContributionRows);

  // 2. New money first. Trims are a fallback for breaches that remain.
  let totalSell = 0;
  let cashFloorHeld = 0;
  if (trimOverweight && afterContribution.breachCount > 0) {
    const cashFloor = afterTotal * (Math.max(0, minCashPct) / 100);

    for (const state of states) {
      const target = targetValue(state.sleeve, afterTotal);
      const floor =
        state.sleeve.path === 'Cash' ? Math.max(target, cashFloor) : target;
      const excess = Math.max(0, state.value - floor);
      if (excess <= 0.5) continue;
      state.value -= excess;
      state.sell += excess;
      totalSell += excess;
    }

    fundDeficits(states, afterTotal, totalSell);

    const cashState = states.find((state) => state.sleeve.path === 'Cash');
    if (cashState && cashFloor > targetValue(cashState.sleeve, afterTotal)) {
      cashFloorHeld = Math.max(
        0,
        cashState.value - targetValue(cashState.sleeve, afterTotal),
      );
    }
  }

  const rows = createRows(states, afterTotal);
  const after = summaryOfRows(rows);
  const buys = rows
    .filter((row) => row.buyAmount > 0.5)
    .sort((a, b) => b.buyAmount - a.buyAmount);
  const sells = rows
    .filter((row) => row.sellAmount > 0.5)
    .sort((a, b) => b.sellAmount - a.sellAmount);
  const totalBuy = buys.reduce((sum, row) => sum + row.buyAmount, 0);
  const unfundedGap = states.reduce(
    (sum, state) =>
      sum + Math.max(0, targetValue(state.sleeve, afterTotal) - state.value),
    0,
  );
  const trimsApplied = totalSell > 0.5;

  let status: RebalancePlanStatus;
  if (!trimsApplied && totalBuy <= 0.5) {
    status = before.breachCount === 0 ? 'no-action' : 'idle';
  } else if (trimsApplied && contribution > 0.5) {
    status = 'fund-and-trim';
  } else if (trimsApplied) {
    status = 'trim';
  } else {
    status = 'fund';
  }

  return {
    status,
    rows,
    buys,
    sells,
    contribution,
    totalBuy,
    totalSell,
    afterTotal,
    before,
    afterContribution,
    after,
    unfundedGap,
    underweightGap,
    overweightGap,
    outsidePolicy,
    cashFloorHeld,
    trimsApplied,
  };
}
