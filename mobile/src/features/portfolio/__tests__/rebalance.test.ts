/** @jest-environment node */

import type { AllocationNode } from '../analytics';
import {
  evaluatePolicy,
  resolvePolicyConfig,
  type PolicyEvaluation,
} from '../policy';
import { planRebalance, type RebalancePlan } from '../rebalance';

/** ₹1,000 in paise keeps every percentage in this suite a whole number. */
const TOTAL = 100_000;

function makeNode(fullPath: string, currentValue: number): AllocationNode {
  return {
    category: fullPath,
    fullPath,
    currentValue,
    currentPercentage: 0,
    idealPercentage: 0,
    diffPercentage: 0,
    diffValue: 0,
    constituents: [],
    subCategories: [],
  };
}

/** Build a real evaluated policy so the planner sees the same types as the app. */
function makeEvaluation(
  targets: Record<string, number>,
  values: Record<string, number>,
  total: number = TOTAL,
): PolicyEvaluation {
  const config = resolvePolicyConfig({ settingsAllocation: targets });
  return evaluatePolicy({
    nodes: Object.entries(values).map(([path, value]) => makeNode(path, value)),
    config,
    total,
  });
}

function makePlan(
  evaluation: PolicyEvaluation,
  options: {
    contribution?: number;
    trims?: boolean;
    minCashPct?: number;
  } = {},
): RebalancePlan {
  return planRebalance({
    evaluation,
    contribution: options.contribution ?? 0,
    trimOverweight: options.trims ?? false,
    minCashPct: options.minCashPct ?? 5,
  });
}

function rowFor(plan: RebalancePlan, path: string) {
  const row = plan.rows.find((candidate) => candidate.path === path);
  if (!row) throw new Error(`No projection row for ${path}`);
  return row;
}

describe('planRebalance', () => {
  it('returns no-targets for the unconfirmed template policy', () => {
    const evaluation = evaluatePolicy({
      nodes: [makeNode('Equities', 50_000), makeNode('Fixed Income', 50_000)],
      config: resolvePolicyConfig({}),
      total: TOTAL,
    });

    const plan = makePlan(evaluation, { contribution: 20_000, trims: true });

    expect(evaluation.isTemplate).toBe(true);
    expect(plan.status).toBe('no-targets');
    expect(plan.totalBuy).toBe(0);
    expect(plan.totalSell).toBe(0);
    expect(plan.buys).toHaveLength(0);
  });

  it('returns no-targets when targets do not total 100%', () => {
    const evaluation = makeEvaluation(
      { Equities: 60, 'Fixed Income': 30 },
      { Equities: 50_000, 'Fixed Income': 50_000 },
    );
    const plan = makePlan(evaluation, { contribution: 10_000 });

    expect(evaluation.isValid).toBe(false);
    expect(plan.status).toBe('no-targets');
    expect(plan.totalBuy).toBe(0);
  });

  it('reports no action when every sleeve is inside its band', () => {
    const evaluation = makeEvaluation(
      { Equities: 50, 'Fixed Income': 50 },
      { Equities: 51_000, 'Fixed Income': 49_000 },
    );
    const plan = makePlan(evaluation);

    expect(plan.status).toBe('no-action');
    expect(plan.after.breachCount).toBe(0);
    expect(plan.buys).toHaveLength(0);
    expect(plan.sells).toHaveLength(0);
  });

  it('funds the largest underweight gap first with new money', () => {
    const evaluation = makeEvaluation(
      { Equities: 60, 'Fixed Income': 20, Cash: 20 },
      { Equities: 40_000, 'Fixed Income': 30_000, Cash: 30_000 },
    );
    const plan = makePlan(evaluation, { contribution: 10_000 });

    expect(plan.status).toBe('fund');
    expect(plan.buys.map((row) => row.path)).toEqual(['Equities']);
    expect(rowFor(plan, 'Equities').buyAmount).toBeCloseTo(10_000, 3);
    expect(rowFor(plan, 'Equities').contributionAmount).toBeCloseTo(10_000, 3);
    expect(rowFor(plan, 'Equities').proceedsAmount).toBe(0);
    expect(plan.totalBuy).toBeCloseTo(10_000, 3);
    expect(plan.totalSell).toBe(0);
    expect(plan.afterContribution.breachCount).toBeGreaterThan(0);
  });

  it('closes every band with new money when the contribution is large enough', () => {
    const evaluation = makeEvaluation(
      { Equities: 50, 'Fixed Income': 50 },
      { Equities: 55_000, 'Fixed Income': 45_000 },
    );
    const plan = makePlan(evaluation, { contribution: 20_000 });

    expect(plan.status).toBe('fund');
    expect(plan.buys.map((row) => row.path)).toEqual([
      'Fixed Income',
      'Equities',
    ]);
    expect(rowFor(plan, 'Fixed Income').buyAmount).toBeCloseTo(15_000, 3);
    expect(rowFor(plan, 'Equities').buyAmount).toBeCloseTo(5_000, 3);
    expect(plan.after.breachCount).toBe(0);
    expect(plan.totalSell).toBe(0);
  });

  it('does not trim when new money alone restores every band', () => {
    const evaluation = makeEvaluation(
      { Equities: 50, 'Fixed Income': 50 },
      { Equities: 55_000, 'Fixed Income': 45_000 },
    );
    const plan = makePlan(evaluation, { contribution: 20_000, trims: true });

    expect(plan.status).toBe('fund');
    expect(plan.trimsApplied).toBe(false);
    expect(plan.totalSell).toBe(0);
    expect(plan.after.breachCount).toBe(0);
  });

  it('sells overweight sleeves back to target and reinvests the proceeds', () => {
    const evaluation = makeEvaluation(
      { Equities: 50, 'Fixed Income': 50 },
      { Equities: 70_000, 'Fixed Income': 30_000 },
    );
    const plan = makePlan(evaluation, { trims: true });

    expect(plan.status).toBe('trim');
    expect(plan.totalSell).toBeCloseTo(20_000, 3);
    expect(plan.totalBuy).toBeCloseTo(20_000, 3);
    expect(rowFor(plan, 'Equities').sellAmount).toBeCloseTo(20_000, 3);
    expect(rowFor(plan, 'Fixed Income').buyAmount).toBeCloseTo(20_000, 3);
    expect(rowFor(plan, 'Fixed Income').contributionAmount).toBe(0);
    expect(rowFor(plan, 'Fixed Income').proceedsAmount).toBeCloseTo(20_000, 3);
    expect(plan.after.breachCount).toBe(0);
  });

  it('uses new money before trimming when both are needed', () => {
    const evaluation = makeEvaluation(
      { Equities: 50, 'Fixed Income': 50 },
      { Equities: 70_000, 'Fixed Income': 30_000 },
    );
    const plan = makePlan(evaluation, { contribution: 10_000, trims: true });

    expect(plan.status).toBe('fund-and-trim');
    expect(plan.totalSell).toBeCloseTo(15_000, 3);
    expect(plan.totalBuy).toBeCloseTo(25_000, 3);
    const funded = rowFor(plan, 'Fixed Income');
    expect(funded.buyAmount).toBeCloseTo(25_000, 3);
    expect(funded.contributionAmount).toBeCloseTo(10_000, 3);
    expect(funded.proceedsAmount).toBeCloseTo(15_000, 3);
    expect(plan.after.breachCount).toBe(0);
  });

  it('never trims cash below the policy reserve floor', () => {
    const evaluation = makeEvaluation(
      { Equities: 80, Cash: 20 },
      { Equities: 60_000, Cash: 40_000 },
    );
    const plan = makePlan(evaluation, { trims: true, minCashPct: 25 });

    expect(rowFor(plan, 'Cash').sellAmount).toBeCloseTo(15_000, 3);
    expect(rowFor(plan, 'Cash').projectedValue).toBeCloseTo(25_000, 3);
    expect(rowFor(plan, 'Equities').buyAmount).toBeCloseTo(15_000, 3);
    expect(rowFor(plan, 'Equities').contributionAmount).toBe(0);
    expect(rowFor(plan, 'Equities').proceedsAmount).toBeCloseTo(15_000, 3);
    expect(plan.cashFloorHeld).toBeCloseTo(5_000, 3);
    expect(plan.unfundedGap).toBeCloseTo(5_000, 3);
    expect(plan.after.breachCount).toBe(1);
  });

  it('surfaces unmanaged value as a gap the plan cannot close', () => {
    const evaluation = makeEvaluation(
      { Equities: 50, 'Fixed Income': 50 },
      { Equities: 50_000, 'Fixed Income': 40_000, Gold: 10_000 },
    );
    const plan = makePlan(evaluation);

    expect(evaluation.unmanaged).toHaveLength(1);
    expect(plan.status).toBe('idle');
    expect(plan.outsidePolicy).toBeCloseTo(10_000, 3);
    expect(plan.underweightGap).toBeCloseTo(10_000, 3);
    expect(plan.overweightGap).toBe(0);
    expect(plan.unfundedGap).toBeCloseTo(10_000, 3);
    expect(plan.buys).toHaveLength(0);
    expect(plan.after.breachCount).toBe(1);
  });
});
