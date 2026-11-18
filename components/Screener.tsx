'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ArrowUpDown, ExternalLink, Loader2, Plus } from 'lucide-react';

type ScreenerResult = {
  sid: string;
  ticker: string;
  name: string;
  sector: string;
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  divYield: number;
};

const SECTORS = [
  "All Sectors", "Financials", "Information Technology", "Health Care", "Consumer Discretionary", 
  "Consumer Staples", "Industrials", "Materials", "Energy", "Utilities", "Communication Services", "Real Estate"
];

const MARKET_CAPS = [
  { label: "All", val: 0 },
  { label: "> 1,000 Cr", val: 10000 },
  { label: "> 10,000 Cr", val: 100000 },
  { label: "> 50,000 Cr", val: 500000 },
  { label: "> 1,00,000 Cr", val: 1000000 }
];

type ScreenerProps = {
  onAdd: (ticker: string) => void;
};

export default function Screener({ onAdd }: ScreenerProps) {
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    sector: "All Sectors",
    minMarketCap: 0,
    maxPE: 100,
    minDivYield: 0
  });
  const [sort, setSort] = useState({ key: "marketCap", order: -1 });

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const tickertapeFilters: any[] = [];
      
      if (filters.sector !== "All Sectors") {
        tickertapeFilters.push({ id: "sector", op: "eq", val: filters.sector });
      }
      
      if (filters.minMarketCap > 0) {
        tickertapeFilters.push({ id: "marketCap", op: "gt", val: filters.minMarketCap });
      }

      if (filters.maxPE < 100) {
        tickertapeFilters.push({ id: "peRatio", op: "lt", val: filters.maxPE });
      }

      if (filters.minDivYield > 0) {
        tickertapeFilters.push({ id: "divYield", op: "gt", val: filters.minDivYield });
      }

      const response = await fetch('/api/screener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: tickertapeFilters,
          sort: sort.key,
          order: sort.order,
          limit: 50
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      // Tickertape returns data in a specific format: { data: { results: [...] } }
      const resultsArray = data?.data?.results || [];
      
      const mappedResults = resultsArray.map((r: any) => {
        const info = r.stock?.info || {};
        const ratios = r.stock?.advancedRatios || {};
        
        return {
          sid: r.sid || Math.random().toString(36).substr(2, 9),
          ticker: info.ticker || r.stock?.ticker || 'N/A',
          name: info.name || r.stock?.name || 'Unknown',
          sector: info.sector || ratios.sector || r.stock?.sector || 'Other',
          marketCap: ratios.marketCap || r.marketCap || 0,
          peRatio: ratios.peRatio || r.peRatio || 0,
          pbRatio: ratios.pbRatio || r.pbRatio || 0,
          divYield: ratios.divYield || r.divYield || 0
        };
      });

      setResults(mappedResults);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [filters, sort]);

  const formatMarketCap = (valInMillions: number) => {
    // Tickertape returns marketCap in millions of INR
    // 1 Cr = 10 million, so divide by 10 to get Cr
    const crores = valInMillions / 10;
    if (crores >= 100000) return `₹${(crores / 100000).toFixed(2)}L Cr`;
    if (crores >= 1000) return `₹${(crores / 1000).toFixed(1)}K Cr`;
    if (crores >= 1) return `₹${crores.toFixed(0)} Cr`;
    return `₹${(crores * 100).toFixed(0)} L`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">Stock Screener</h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Filter Indian equities by sector, market cap, valuation and dividend yield
          </p>
        </div>
        <button 
          onClick={fetchResults}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 md:self-auto dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Refresh results
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Sector</label>
          <select 
            value={filters.sector}
            onChange={(e) => setFilters(f => ({ ...f, sector: e.target.value }))}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-sm text-zinc-900 outline-none transition-colors hover:border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Market Cap</label>
          <select 
            value={filters.minMarketCap}
            onChange={(e) => setFilters(f => ({ ...f, minMarketCap: Number(e.target.value) }))}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-sm text-zinc-900 outline-none transition-colors hover:border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {MARKET_CAPS.map(m => <option key={m.label} value={m.val}>{m.label}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Max PE ratio ({filters.maxPE})</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={filters.maxPE}
            onChange={(e) => setFilters(f => ({ ...f, maxPE: Number(e.target.value) }))}
            className="h-9 w-full cursor-pointer accent-blue-600"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Min div. yield ({filters.minDivYield}%)</label>
          <input 
            type="range" 
            min="0" 
            max="10" 
            step="0.5"
            value={filters.minDivYield}
            onChange={(e) => setFilters(f => ({ ...f, minDivYield: Number(e.target.value) }))}
            className="h-9 w-full cursor-pointer accent-blue-600"
          />
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-zinc-50/95 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 backdrop-blur dark:bg-zinc-950/90 dark:text-zinc-400">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-5 py-3">Stock</th>
                <th className="cursor-pointer px-5 py-3 text-right transition-colors hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => setSort({ key: 'marketCap', order: sort.order * -1 })}>
                  Market Cap <ArrowUpDown className="ml-1 inline h-3 w-3" />
                </th>
                <th className="cursor-pointer px-5 py-3 text-right transition-colors hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => setSort({ key: 'peRatio', order: sort.order * -1 })}>
                  PE Ratio <ArrowUpDown className="ml-1 inline h-3 w-3" />
                </th>
                <th className="px-5 py-3 text-right">Div Yield</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              <AnimatePresence mode="popLayout">
                {results.map((stock, idx) => (
                  <motion.tr 
                    key={stock.sid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{stock.ticker}</span>
                        <span className="max-w-[220px] truncate text-xs text-zinc-500 dark:text-zinc-400">{stock.name}</span>
                        <span className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">{stock.sector}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
                      {formatMarketCap(stock.marketCap)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
                      {stock.peRatio ? stock.peRatio.toFixed(2) : '-'}
                    </td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
                      {stock.divYield ? `${stock.divYield.toFixed(2)}%` : '-'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => onAdd(stock.ticker)}
                          className="rounded-md p-1.5 text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                          title="Add to Portfolio"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <a 
                          href={`https://www.tickertape.in/stocks/${stock.name.toLowerCase().replace(/ /g, '-')}-${stock.ticker}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {results.length === 0 && !loading && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white">No stocks found</h3>
            <p className="text-zinc-500 dark:text-zinc-400">Try adjusting your filters to see more results.</p>
          </div>
        )}

        {loading && (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400">Scanning the market...</p>
          </div>
        )}
      </div>
      
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 text-sm">
          Error: {error}
        </div>
      )}
    </div>
  );
}
