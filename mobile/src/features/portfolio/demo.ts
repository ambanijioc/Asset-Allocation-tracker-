import type { Asset, FundData, PriceData, ScreenerFilters, ScreenerStock } from './types';

/**
 * Bundled demo portfolio. Used when the backend is unreachable or demo mode is
 * enabled, so the UI can be reviewed without production credentials.
 */
export const demoAssets: Asset[] = [
  {
    id: 'demo-1',
    symbol: 'HDFCBANK.NS',
    name: 'HDFC Bank',
    quantity: 60,
    entryPrice: 742.5,
    currency: 'INR',
    type: 'STOCK',
    exchange: 'NSE',
    purchaseDate: '2023-06-14',
  },
  {
    id: 'demo-2',
    symbol: 'RELIANCE.NS',
    name: 'Reliance Industries',
    quantity: 35,
    entryPrice: 1240.75,
    currency: 'INR',
    type: 'STOCK',
    exchange: 'NSE',
    purchaseDate: '2023-09-02',
  },
  {
    id: 'demo-3',
    symbol: 'INFY.NS',
    name: 'Infosys',
    quantity: 45,
    entryPrice: 1512.4,
    currency: 'INR',
    type: 'STOCK',
    exchange: 'NSE',
    purchaseDate: '2024-01-18',
  },
  {
    id: 'demo-4',
    symbol: 'MF_PARAG',
    name: 'Parag Parikh Flexi Cap — Direct',
    quantity: 820,
    entryPrice: 68.42,
    currency: 'INR',
    type: 'MUTUALFUND',
    purchaseDate: '2023-03-21',
  },
  {
    id: 'demo-5',
    symbol: 'NIFTYBEES.NS',
    name: 'Nippon India Nifty 50 ETF',
    quantity: 300,
    entryPrice: 232.15,
    currency: 'INR',
    type: 'ETF',
    exchange: 'NSE',
    purchaseDate: '2024-02-08',
  },
  {
    id: 'demo-6',
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    quantity: 0.042,
    entryPrice: 51200,
    currency: 'USD',
    type: 'CRYPTO',
    purchaseDate: '2024-04-11',
  },
  {
    id: 'demo-7',
    symbol: 'GOLD-INR-GRAM',
    name: 'Gold (24K)',
    quantity: 85,
    entryPrice: 6210,
    currency: 'INR',
    type: 'GOLD',
    purchaseDate: '2022-10-04',
  },
  {
    id: 'demo-8',
    symbol: 'CASH-INR',
    name: 'Cash & equivalents',
    quantity: 240000,
    entryPrice: 1,
    currency: 'INR',
    type: 'CASH',
  },
];

export const demoPrices: Record<string, PriceData> = {
  'HDFCBANK.NS': {
    symbol: 'HDFCBANK.NS',
    regularMarketPrice: 816.5,
    currency: 'INR',
    shortName: 'HDFC Bank',
    sector: 'Financial Services',
    marketCap: 12_500_000_000_000,
    source: 'demo',
  },
  'RELIANCE.NS': {
    symbol: 'RELIANCE.NS',
    regularMarketPrice: 1344.8,
    currency: 'INR',
    shortName: 'Reliance Industries',
    sector: 'Energy',
    marketCap: 18_200_000_000_000,
    source: 'demo',
  },
  'INFY.NS': {
    symbol: 'INFY.NS',
    regularMarketPrice: 1742.85,
    currency: 'INR',
    shortName: 'Infosys',
    sector: 'Technology',
    marketCap: 7_200_000_000_000,
    source: 'demo',
  },
  MF_PARAG: {
    symbol: 'MF_PARAG',
    regularMarketPrice: 79.18,
    currency: 'INR',
    shortName: 'Parag Parikh Flexi Cap',
    source: 'demo',
  },
  'NIFTYBEES.NS': {
    symbol: 'NIFTYBEES.NS',
    regularMarketPrice: 268.4,
    currency: 'INR',
    shortName: 'Nippon India Nifty 50 ETF',
    source: 'demo',
  },
  'BTC-USD': {
    symbol: 'BTC-USD',
    regularMarketPrice: 67450,
    currency: 'USD',
    shortName: 'Bitcoin',
    source: 'demo',
  },
  'GOLD-INR-GRAM': {
    symbol: 'GOLD-INR-GRAM',
    regularMarketPrice: 7185,
    currency: 'INR',
    shortName: 'Gold (24K)',
    source: 'demo',
  },
  'CASH-INR': {
    symbol: 'CASH-INR',
    regularMarketPrice: 1,
    currency: 'INR',
    shortName: 'Cash',
    source: 'demo',
  },
  'INR=X': {
    symbol: 'INR=X',
    regularMarketPrice: 84,
    currency: 'INR',
    shortName: 'USD/INR',
    source: 'demo',
  },
};

/**
 * Bundled Indian equity snapshot for the demo screener. Market caps are in
 * millions of INR, matching the screener API contract, and the values are
 * illustrative rather than live quotes.
 */
export const demoScreenerStocks: ScreenerStock[] = [
  { sid: 'demo-rel', ticker: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', marketCap: 18_200_000, peRatio: 24.8, divYield: 0.4 },
  { sid: 'demo-tcs', ticker: 'TCS', name: 'Tata Consultancy Services', sector: 'Technology', marketCap: 14_600_000, peRatio: 28.7, divYield: 1.3 },
  { sid: 'demo-hdfcb', ticker: 'HDFCBANK', name: 'HDFC Bank', sector: 'Financial Services', marketCap: 12_500_000, peRatio: 19.2, divYield: 1.1 },
  { sid: 'demo-bharti', ticker: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Communication Services', marketCap: 10_100_000, peRatio: 62.4, divYield: 0.3 },
  { sid: 'demo-icici', ticker: 'ICICIBANK', name: 'ICICI Bank', sector: 'Financial Services', marketCap: 9_400_000, peRatio: 18.1, divYield: 0.8 },
  { sid: 'demo-infy', ticker: 'INFY', name: 'Infosys', sector: 'Technology', marketCap: 7_200_000, peRatio: 25.4, divYield: 2.3 },
  { sid: 'demo-itc', ticker: 'ITC', name: 'ITC', sector: 'Consumer Defensive', marketCap: 5_400_000, peRatio: 26.2, divYield: 3.4 },
  { sid: 'demo-lt', ticker: 'LT', name: 'Larsen & Toubro', sector: 'Industrials', marketCap: 5_000_000, peRatio: 34.6, divYield: 0.9 },
  { sid: 'demo-bajfin', ticker: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'Financial Services', marketCap: 4_500_000, peRatio: 29.8, divYield: 0.5 },
  { sid: 'demo-sunph', ticker: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Healthcare', marketCap: 4_200_000, peRatio: 37.5, divYield: 0.8 },
  { sid: 'demo-maruti', ticker: 'MARUTI', name: 'Maruti Suzuki', sector: 'Consumer Cyclical', marketCap: 3_800_000, peRatio: 26.4, divYield: 0.8 },
  { sid: 'demo-kotak', ticker: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Financial Services', marketCap: 3_600_000, peRatio: 17.9, divYield: 0.1 },
  { sid: 'demo-axis', ticker: 'AXISBANK', name: 'Axis Bank', sector: 'Financial Services', marketCap: 3_400_000, peRatio: 13.2, divYield: 0.1 },
  { sid: 'demo-titan', ticker: 'TITAN', name: 'Titan Company', sector: 'Consumer Cyclical', marketCap: 3_400_000, peRatio: 93.2, divYield: 0.3 },
  { sid: 'demo-asian', ticker: 'ASIANPAINT', name: 'Asian Paints', sector: 'Basic Materials', marketCap: 2_800_000, peRatio: 52.4, divYield: 1.2 },
  { sid: 'demo-wipro', ticker: 'WIPRO', name: 'Wipro', sector: 'Technology', marketCap: 2_700_000, peRatio: 23.1, divYield: 0.5 },
  { sid: 'demo-dmart', ticker: 'DMART', name: 'Avenue Supermarts', sector: 'Consumer Defensive', marketCap: 2_600_000, peRatio: 78.4, divYield: 0 },
  { sid: 'demo-persist', ticker: 'PERSISTENT', name: 'Persistent Systems', sector: 'Technology', marketCap: 710_000, peRatio: 58.3, divYield: 0.3 },
  { sid: 'demo-apl', ticker: 'APLAPOLLO', name: 'APL Apollo Tubes', sector: 'Basic Materials', marketCap: 200_000, peRatio: 49.8, divYield: 0.2 },
  { sid: 'demo-vinati', ticker: 'VINATIORGA', name: 'Vinati Organics', sector: 'Basic Materials', marketCap: 180_000, peRatio: 38.4, divYield: 0.8 },
  { sid: 'demo-fineorg', ticker: 'FINEORG', name: 'Fine Organic Industries', sector: 'Basic Materials', marketCap: 140_000, peRatio: 33.6, divYield: 1.1 },
  { sid: 'demo-cera', ticker: 'CERA', name: 'Cera Sanitaryware', sector: 'Industrials', marketCap: 100_000, peRatio: 42.1, divYield: 0.7 },
  { sid: 'demo-kirlpn', ticker: 'KIRLPNU', name: 'Kirloskar Pneumatic', sector: 'Industrials', marketCap: 15_000, peRatio: 42.8, divYield: 0.7 },
  { sid: 'demo-capli', ticker: 'CAPLIPOINT', name: 'Caplin Point Laboratories', sector: 'Healthcare', marketCap: 7_500, peRatio: 22.5, divYield: 0.5 },
  { sid: 'demo-fineotex', ticker: 'FINEOTEX', name: 'Fineotex Chemical', sector: 'Basic Materials', marketCap: 4_200, peRatio: 31.0, divYield: 0.4 },
  { sid: 'demo-rajratan', ticker: 'RAJRATAN', name: 'Rajratan Global Wire', sector: 'Basic Materials', marketCap: 2_600, peRatio: 28.0, divYield: 0.6 },
];

function matchesDemoFilter(stock: ScreenerStock, filter: ScreenerFilters['filters'][number]) {
  const value = stock[filter.id as keyof ScreenerStock];
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;

  if (Array.isArray(filter.val)) {
    return value >= filter.val[0] && value <= filter.val[1];
  }

  switch (filter.op) {
    case 'gt':
      return value > filter.val;
    case 'gte':
      return value >= filter.val;
    case 'lt':
      return value < filter.val;
    case 'lte':
      return value <= filter.val;
    case 'eq':
      return value === filter.val;
    case 'between':
      return false;
  }
}

/** Applies screener filters to the bundled snapshot so demo mode works offline. */
export function screenDemoStocks(filters: ScreenerFilters): ScreenerStock[] {
  const matching = demoScreenerStocks.filter((stock) =>
    filters.filters.every((filter) => matchesDemoFilter(stock, filter)),
  );
  const sortKey = filters.sort as 'marketCap' | 'peRatio' | 'divYield';
  const direction = filters.order === 1 ? 1 : -1;

  matching.sort((a, b) => {
    const left = a[sortKey];
    const right = b[sortKey];
    if (typeof left !== 'number') return 1;
    if (typeof right !== 'number') return -1;
    return (left - right) * direction;
  });

  return matching.slice(0, filters.limit);
}

/**
 * Cached look-through snapshots, mirroring the `fundHoldings` map the web app
 * stores on the user document. Percentages follow the provider convention:
 * holdings are fractions (0.082), sector/cap weights are percentages (30).
 */
export const demoFundHoldings: Record<string, FundData> = {
  MF_PARAG: {
    symbol: 'MF_PARAG',
    source: 'demo',
    categoryName: 'Flexi Cap Fund',
    holdings: [
      { symbol: 'HDFCBANK.NS', holdingName: 'HDFC Bank', holdingPercent: 0.082 },
      { symbol: 'RELIANCE.NS', holdingName: 'Reliance Industries', holdingPercent: 0.07 },
      { symbol: 'INFY.NS', holdingName: 'Infosys', holdingPercent: 0.054 },
      { symbol: 'GOOGL', holdingName: 'Alphabet Inc.', holdingPercent: 0.05 },
      { symbol: 'META', holdingName: 'Meta Platforms', holdingPercent: 0.047 },
      { symbol: 'AMZN', holdingName: 'Amazon.com', holdingPercent: 0.04 },
      { symbol: 'ITC.NS', holdingName: 'ITC', holdingPercent: 0.034 },
      { symbol: 'KOTAKBANK.NS', holdingName: 'Kotak Mahindra Bank', holdingPercent: 0.032 },
      { symbol: 'MARUTI.NS', holdingName: 'Maruti Suzuki', holdingPercent: 0.029 },
      { symbol: 'AXISBANK.NS', holdingName: 'Axis Bank', holdingPercent: 0.027 },
    ],
    sectorWeightings: [
      { sector: 'Financial Services', percentage: 27 },
      { sector: 'Technology', percentage: 16 },
      { sector: 'Communication Services', percentage: 11 },
      { sector: 'Consumer Cyclical', percentage: 10 },
      { sector: 'Energy', percentage: 8 },
      { sector: 'Healthcare', percentage: 7 },
      { sector: 'Consumer Defensive', percentage: 6 },
      { sector: 'Industrials', percentage: 5 },
      { sector: 'Basic Materials', percentage: 4 },
      { sector: 'Other / Uncategorized', percentage: 6 },
    ],
    assetAllocation: {
      stockPosition: 88,
      bondPosition: 3,
      cashPosition: 7,
      otherPosition: 2,
      preferredPosition: 0,
      convertiblePosition: 0,
    },
    marketCapWeightage: { largeCap: 56, midCap: 19, smallCap: 9, others: 16 },
  },
  'NIFTYBEES.NS': {
    symbol: 'NIFTYBEES.NS',
    source: 'demo',
    categoryName: 'Large Cap ETF',
    holdings: [
      { symbol: 'HDFCBANK.NS', holdingName: 'HDFC Bank', holdingPercent: 0.113 },
      { symbol: 'RELIANCE.NS', holdingName: 'Reliance Industries', holdingPercent: 0.097 },
      { symbol: 'ICICIBANK.NS', holdingName: 'ICICI Bank', holdingPercent: 0.076 },
      { symbol: 'INFY.NS', holdingName: 'Infosys', holdingPercent: 0.057 },
      { symbol: 'TCS.NS', holdingName: 'Tata Consultancy Services', holdingPercent: 0.055 },
      { symbol: 'ITC.NS', holdingName: 'ITC', holdingPercent: 0.043 },
      { symbol: 'BHARTIARTL.NS', holdingName: 'Bharti Airtel', holdingPercent: 0.04 },
      { symbol: 'LT.NS', holdingName: 'Larsen & Toubro', holdingPercent: 0.039 },
      { symbol: 'KOTAKBANK.NS', holdingName: 'Kotak Mahindra Bank', holdingPercent: 0.033 },
      { symbol: 'AXISBANK.NS', holdingName: 'Axis Bank', holdingPercent: 0.031 },
    ],
    sectorWeightings: [
      { sector: 'Financial Services', percentage: 37 },
      { sector: 'Technology', percentage: 14 },
      { sector: 'Energy', percentage: 11 },
      { sector: 'Consumer Defensive', percentage: 9 },
      { sector: 'Communication Services', percentage: 7 },
      { sector: 'Consumer Cyclical', percentage: 6 },
      { sector: 'Healthcare', percentage: 4 },
      { sector: 'Industrials', percentage: 4 },
      { sector: 'Basic Materials', percentage: 3 },
      { sector: 'Other / Uncategorized', percentage: 5 },
    ],
    assetAllocation: {
      stockPosition: 99.8,
      bondPosition: 0,
      cashPosition: 0.2,
      otherPosition: 0,
      preferredPosition: 0,
      convertiblePosition: 0,
    },
    marketCapWeightage: { largeCap: 92, midCap: 8, smallCap: 0, others: 0 },
  },
};
