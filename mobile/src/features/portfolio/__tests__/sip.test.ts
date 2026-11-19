/** @jest-environment node */

import type { AllocationNode } from '../analytics';
import type { RebalanceProjectionRow } from '../rebalance';
import { buildSipPlan, investableAssetsBySleeve } from '../sip';

function makeNode(
  fullPath: string,
  constituents: { name: string; symbol: string; value: number }[] = [],
  subCategories: AllocationNode[] = [],
): AllocationNode {
  return {
    category: fullPath.split(' > ').pop() ?? fullPath,
    fullPath,
    currentValue: 0,
    currentPercentage: 0,
    idealPercentage: 0,
    diffPercentage: 0,
    diffValue: 0,
    constituents,
    subCategories,
  };
}

function makeRow(input: {
  path: string;
  contributionAmount: number;
  proceedsAmount?: number;
}): RebalanceProjectionRow {
  const proceedsAmount = input.proceedsAmount ?? 0;
  return {
    path: input.path,
    label: input.path.split(' > ').pop() ?? input.path,
    color: '#000000',
    targetPercentage: 0,
    bandPp: 5,
    currentPercentage: 0,
    projectedPercentage: 0,
    currentDriftPp: 0,
    projectedDriftPp: 0,
    projectedStatus: 'within',
    currentValue: 0,
    projectedValue: 0,
    buyAmount: input.contributionAmount + proceedsAmount,
    contributionAmount: input.contributionAmount,
    proceedsAmount,
    sellAmount: 0,
  };
}

const EQUITIES = makeNode('Equities', [
  { name: 'Alpha Fund', symbol: 'ALPHA', value: 30_000 },
  { name: 'Beta ETF', symbol: 'BETA', value: 10_000 },
]);
const FIXED_INCOME = makeNode('Fixed Income', [
  { name: 'Debt Fund', symbol: 'DEBT', value: 50_000 },
]);

describe('investableAssetsBySleeve', () => {
  it('maps holdings nested under sub-categories to their top-level sleeve', () => {
    const nodes = [
      makeNode('Equities', [], [
        makeNode('Equities > Domestic Equity', [
          { name: 'Alpha Fund', symbol: 'ALPHA', value: 30_000 },
          { name: 'Beta ETF', symbol: 'BETA', value: 10_000 },
        ]),
      ]),
    ];

    const grouped = investableAssetsBySleeve(nodes);

    expect(grouped.Equities.map((asset) => asset.symbol)).toEqual([
      'ALPHA',
      'BETA',
    ]);
    expect(grouped.Equities[0].currentValue).toBe(30_000);
  });

  it('offers a fund held in two sleeves only in its dominant sleeve', () => {
    const nodes = [
      makeNode('Equities', [
        { name: 'Hybrid Fund', symbol: 'HYBRID', value: 70_000 },
      ]),
      makeNode('Fixed Income', [
        { name: 'Hybrid Fund', symbol: 'HYBRID', value: 30_000 },
        { name: 'Debt Fund', symbol: 'DEBT', value: 10_000 },
      ]),
    ];

    const grouped = investableAssetsBySleeve(nodes);

    expect(grouped.Equities.map((asset) => asset.symbol)).toEqual(['HYBRID']);
    expect(grouped['Fixed Income'].map((asset) => asset.symbol)).toEqual([
      'DEBT',
    ]);
  });
});

describe('buildSipPlan', () => {
  it('splits the contribution by sleeve and then by current holdings', () => {
    const sip = buildSipPlan({
      rows: [
        makeRow({ path: 'Equities', contributionAmount: 60_000 }),
        makeRow({ path: 'Fixed Income', contributionAmount: 40_000 }),
        // Trim proceeds are internal reallocation, not new money.
        makeRow({ path: 'Commodities', contributionAmount: 0, proceedsAmount: 10_000 }),
      ],
      nodes: [EQUITIES, FIXED_INCOME],
      contribution: 100_000,
    });

    expect(sip.sleeves.map((sleeve) => sleeve.path)).toEqual([
      'Equities',
      'Fixed Income',
    ]);
    expect(sip.sleeves[0].amount).toBe(60_000);
    expect(sip.sleeves[0].percentOfContribution).toBeCloseTo(60, 6);
    expect(sip.sleeves[1].amount).toBe(40_000);
    expect(sip.sleeves[1].percentOfContribution).toBeCloseTo(40, 6);

    const [alpha, beta] = sip.sleeves[0].assets;
    expect(alpha.amount).toBeCloseTo(45_000, 3);
    expect(alpha.percentOfContribution).toBeCloseTo(45, 6);
    expect(beta.amount).toBeCloseTo(15_000, 3);
    expect(beta.percentOfContribution).toBeCloseTo(15, 6);

    expect(sip.sleeves[1].assets[0].amount).toBeCloseTo(40_000, 3);
    expect(sip.allocated).toBeCloseTo(100_000, 3);
    expect(sip.unallocated).toBe(0);
    expect(sip.selectedCount).toBe(3);
    expect(sip.availableCount).toBe(3);
  });

  it('redistributes a sleeve only across its selected holdings', () => {
    const sip = buildSipPlan({
      rows: [
        makeRow({ path: 'Equities', contributionAmount: 60_000 }),
        makeRow({ path: 'Fixed Income', contributionAmount: 40_000 }),
      ],
      nodes: [EQUITIES, FIXED_INCOME],
      contribution: 100_000,
      excluded: new Set(['Equities::ALPHA', 'Fixed Income::DEBT']),
    });

    const equities = sip.sleeves[0];
    expect(equities.assets.find((asset) => asset.symbol === 'ALPHA')?.amount).toBe(0);
    expect(equities.assets.find((asset) => asset.symbol === 'ALPHA')?.selected).toBe(
      false,
    );
    expect(equities.assets.find((asset) => asset.symbol === 'BETA')?.amount).toBeCloseTo(
      60_000,
      3,
    );
    expect(equities.unallocated).toBe(0);

    const fixedIncome = sip.sleeves[1];
    expect(fixedIncome.assets[0].amount).toBe(0);
    expect(fixedIncome.unallocated).toBeCloseTo(40_000, 3);

    expect(sip.allocated).toBeCloseTo(60_000, 3);
    expect(sip.unallocated).toBeCloseTo(40_000, 3);
    expect(sip.selectedCount).toBe(1);
    expect(sip.availableCount).toBe(3);
  });

  it('leaves everything unassigned when no holding is selected', () => {
    const sip = buildSipPlan({
      rows: [makeRow({ path: 'Equities', contributionAmount: 60_000 })],
      nodes: [EQUITIES],
      contribution: 60_000,
      excluded: new Set(['Equities::ALPHA', 'Equities::BETA']),
    });

    expect(sip.allocated).toBe(0);
    expect(sip.unallocated).toBeCloseTo(60_000, 3);
    expect(sip.sleeves[0].unallocated).toBeCloseTo(60_000, 3);
    expect(sip.selectedCount).toBe(0);
  });

  it('surfaces money for a sleeve with no held asset as unallocated', () => {
    const sip = buildSipPlan({
      rows: [makeRow({ path: 'Equities', contributionAmount: 50_000 })],
      nodes: [FIXED_INCOME],
      contribution: 50_000,
    });

    expect(sip.sleeves).toHaveLength(1);
    expect(sip.sleeves[0].path).toBe('Equities');
    expect(sip.sleeves[0].assets).toEqual([]);
    expect(sip.sleeves[0].unallocated).toBeCloseTo(50_000, 3);
    expect(sip.allocated).toBe(0);
    expect(sip.unallocated).toBeCloseTo(50_000, 3);
    expect(sip.availableCount).toBe(0);
  });
});
