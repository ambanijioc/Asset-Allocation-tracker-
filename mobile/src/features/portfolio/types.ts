/**
 * Domain types. Kept structurally compatible with the web app's `lib/types.ts`
 * so the same MongoDB documents can be consumed without a translation layer.
 */
export type Asset = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  entryPrice: number;
  manualPrice?: number;
  manualSector?: string;
  purchaseDate?: string;
  /** Last quote returned by an exchange integration. */
  currentPrice?: number;
  currency: string;
  type: string;
  categoryPath?: string[];
  exchange?: string;
  isGroup?: boolean;
  subItems?: Asset[];
};

export type PriceData = {
  symbol: string;
  regularMarketPrice: number | null;
  currency: string;
  shortName: string;
  marketCap?: number | null;
  quoteType?: string | null;
  sector?: string | null;
  source?: string | null;
  lastUpdated?: number;
};

export type PolicySource = 'template' | 'custom' | 'migrated';
export type PolicyReviewCadence = 'quarterly' | 'semiannual' | 'annual';
export type PolicyRebalanceMethod = 'threshold' | 'calendar' | 'hybrid';

export type PolicyRebalance = {
  method: PolicyRebalanceMethod;
  cashFlowFirst: boolean;
  minCashPct: number;
};

/**
 * A versioned allocation policy. `targets` mirrors the web's
 * `settings.idealAllocation` shape: root paths are percentages of the whole
 * portfolio, while child paths are percentages of their parent. Bands apply to
 * root sleeves and are expressed in percentage points.
 */
export type Policy = {
  id: string;
  version: number;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
  baseCurrency: 'INR';
  targets: Record<string, number>;
  bands: Record<string, number>;
  rebalance: PolicyRebalance;
  reviewCadence: PolicyReviewCadence;
  confirmedAt: string | null;
  source: PolicySource;
};

export type FundHolding = {
  symbol: string;
  holdingName: string;
  /** Fraction (0.08) or percentage (8) depending on the provider. */
  holdingPercent: number;
};

export type FundSectorWeighting = {
  sector: string;
  percentage: number;
};

export type FundAssetAllocation = {
  stockPosition: number;
  bondPosition: number;
  cashPosition: number;
  otherPosition: number;
  preferredPosition: number;
  convertiblePosition: number;
};

export type FundMarketCapWeightage = {
  largeCap: number;
  midCap: number;
  smallCap: number;
  others: number;
};

/** Look-through data returned by `/api/holdings` (and cached on the user doc). */
export type FundData = {
  symbol?: string;
  source?: string | null;
  categoryName?: string | null;
  holdings?: FundHolding[];
  sectorWeightings?: FundSectorWeighting[];
  assetAllocation?: FundAssetAllocation | null;
  marketCapWeightage?: FundMarketCapWeightage | null;
  /** `tracked-index` for ETF index look-through, `proxy-fund` for same-index funds. */
  lookthrough?: string | null;
  note?: string | null;
  debug?: string;
};

export type PortfolioSnapshot = {
  uid?: string;
  email?: string;
  displayName?: string;
  assets?: Asset[];
  fundHoldings?: Record<string, FundData>;
  idealAllocation?: Record<string, number>;
  policy?: Policy;
  policyHistory?: Policy[];
  settings?: {
    idealAllocation?: Record<string, number>;
    [key: string]: unknown;
  };
  /** Exchange balance cache written by the web dashboard. */
  cachedCrypto?: Record<
    string,
    {
      lastSynced?: number;
      assets?: Asset[];
    }
  >;
  updatedAt?: string;
};

export type SyncResponse = {
  success: boolean;
  data: PortfolioSnapshot;
};

export type ScreenerStock = {
  sid: string;
  ticker: string;
  name: string;
  sector?: string;
  /** Market cap in millions of INR, exactly as the screener reports it. */
  marketCap?: number;
  peRatio?: number;
  pbRatio?: number;
  divYield?: number;
  price?: number;
  change?: number;
  pchange?: number;
};

export type ScreenerFilter = {
  id: string;
  op: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';
  val: number | [number, number];
};

export type ScreenerFilters = {
  filters: ScreenerFilter[];
  sort: string;
  order: 1 | -1;
  limit: number;
};
