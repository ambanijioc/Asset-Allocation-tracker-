import type { AllocationNode } from './analytics';
import type { RebalanceProjectionRow } from './rebalance';

/**
 * Asset-level guidance for the new money the user entered. Sleeve amounts come
 * from the rebalance plan; this module splits only the contribution-funded
 * sleeves across the holdings already owned in each sleeve. Trim proceeds are
 * deliberately excluded: those are internal reallocations, not new money.
 */
export interface SipAssetAllocation {
  key: string;
  symbol: string;
  name: string;
  sleevePath: string;
  /** Current value attributed to this sleeve, used as the default split weight. */
  currentValue: number;
  selected: boolean;
  amount: number;
  percentOfContribution: number;
}

export interface SipSleeveAllocation {
  path: string;
  label: string;
  color: string;
  amount: number;
  percentOfContribution: number;
  assets: SipAssetAllocation[];
  /** Contribution left unassigned because no asset in the sleeve is selected. */
  unallocated: number;
}

export interface SipPlan {
  sleeves: SipSleeveAllocation[];
  contribution: number;
  allocated: number;
  unallocated: number;
  selectedCount: number;
  availableCount: number;
}

interface Candidate {
  key: string;
  symbol: string;
  name: string;
  sleevePath: string;
  currentValue: number;
}

function candidateKey(sleevePath: string, symbol: string): string {
  return `${sleevePath}::${symbol}`;
}

/** Collect actual holdings from every level of an allocation subtree. */
function collectConstituents(
  node: AllocationNode,
  collected: Map<string, { name: string; value: number }>,
): void {
  for (const item of node.constituents) {
    const key = item.symbol || item.name;
    const existing = collected.get(key);
    if (existing) existing.value += item.value;
    else collected.set(key, { name: item.name, value: item.value });
  }
  for (const child of node.subCategories) {
    collectConstituents(child, collected);
  }
}

/**
 * Map the allocation tree to the assets that can receive new money in each
 * policy sleeve. A fund split across sleeves (for example a hybrid fund) is
 * assigned to the sleeve where it holds the largest share, so the same symbol
 * is not offered twice in the picker.
 */
export function investableAssetsBySleeve(
  nodes: AllocationNode[],
): Record<string, Candidate[]> {
  const bestBySymbol = new Map<
    string,
    { sleevePath: string; symbol: string; name: string; value: number }
  >();

  for (const node of nodes) {
    const collected = new Map<string, { name: string; value: number }>();
    collectConstituents(node, collected);

    for (const [symbol, entry] of collected) {
      if (!Number.isFinite(entry.value) || entry.value <= 0) continue;
      const existing = bestBySymbol.get(symbol);
      if (!existing || entry.value > existing.value) {
        bestBySymbol.set(symbol, {
          sleevePath: node.fullPath,
          symbol,
          name: entry.name,
          value: entry.value,
        });
      }
    }
  }

  const grouped: Record<string, Candidate[]> = {};
  for (const entry of bestBySymbol.values()) {
    const candidates = grouped[entry.sleevePath] ?? [];
    candidates.push({
      key: candidateKey(entry.sleevePath, entry.symbol),
      symbol: entry.symbol,
      name: entry.name,
      sleevePath: entry.sleevePath,
      currentValue: entry.value,
    });
    grouped[entry.sleevePath] = candidates;
  }

  for (const candidates of Object.values(grouped)) {
    candidates.sort((a, b) => b.currentValue - a.currentValue);
  }
  return grouped;
}

export function buildSipPlan(input: {
  rows: RebalanceProjectionRow[];
  nodes: AllocationNode[];
  contribution: number;
  excluded?: ReadonlySet<string>;
}): SipPlan {
  const { rows, nodes, contribution, excluded } = input;
  const candidatesBySleeve = investableAssetsBySleeve(nodes);

  let selectedCount = 0;
  let availableCount = 0;

  const sleeves: SipSleeveAllocation[] = rows
    .filter((row) => row.contributionAmount > 0.5)
    .map((row) => {
      const candidates = candidatesBySleeve[row.path] ?? [];
      const selected = candidates.filter((asset) => !excluded?.has(asset.key));
      const selectedValue = selected.reduce(
        (sum, asset) => sum + asset.currentValue,
        0,
      );
      availableCount += candidates.length;
      selectedCount += selected.length;

      const assets: SipAssetAllocation[] = candidates.map((asset) => {
        const isSelected = !excluded?.has(asset.key);
        if (!isSelected) {
          return {
            ...asset,
            selected: false,
            amount: 0,
            percentOfContribution: 0,
          };
        }

        // Keep the sleeve's current composition by default. The equal split is
        // only a guard for a sleeve whose selected assets have no value yet.
        const proportion =
          selectedValue > 0
            ? asset.currentValue / selectedValue
            : 1 / selected.length;
        const amount = row.contributionAmount * proportion;
        return {
          ...asset,
          selected: true,
          amount,
          percentOfContribution:
            contribution > 0 ? (amount / contribution) * 100 : 0,
        };
      });

      const allocated = assets.reduce(
        (sum, asset) => sum + (asset.selected ? asset.amount : 0),
        0,
      );

      return {
        path: row.path,
        label: row.label,
        color: row.color,
        amount: row.contributionAmount,
        percentOfContribution:
          contribution > 0 ? (row.contributionAmount / contribution) * 100 : 0,
        assets,
        unallocated: Math.max(0, row.contributionAmount - allocated),
      };
    });

  const allocated = sleeves.reduce(
    (sum, sleeve) =>
      sum +
      sleeve.assets.reduce(
        (assetSum, asset) => assetSum + (asset.selected ? asset.amount : 0),
        0,
      ),
    0,
  );

  return {
    sleeves,
    contribution,
    allocated,
    unallocated: Math.max(0, contribution - allocated),
    selectedCount,
    availableCount,
  };
}
