'use client';

import { useEffect, useState } from 'react';

interface UsageData {
  configured: boolean;
  month: string;
  used: number;
  limit: number;
  remaining: number;
  lastStatus: number | null;
  lastStatusAt: string | null;
}

export default function IndianApiUsage({ compact = false }: { compact?: boolean }) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/indianapi-usage', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as UsageData;
        if (!cancelled) {
          setUsage(data);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    load();
    // Keep the counter fresh while the modal is open. The component unmounts
    // when the modal closes, so this does not poll in the background.
    const timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (failed && !usage) {
    return compact ? null : (
      <p className="mt-2 text-[11px] text-zinc-400">IndianAPI usage unavailable.</p>
    );
  }

  if (!usage) {
    return (
      <p className={`text-[11px] text-zinc-400 ${compact ? 'mt-2' : 'mt-3'}`}>
        Loading IndianAPI usage…
      </p>
    );
  }

  if (!usage.configured) {
    return compact ? null : (
      <p className="mt-2 text-[11px] text-zinc-400">
        IndianAPI usage tracking requires MongoDB.
      </p>
    );
  }

  const pct = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const rateLimited = usage.lastStatus === 429;
  const tone = rateLimited || pct >= 90 ? 'red' : pct >= 70 ? 'amber' : 'emerald';
  const barColor = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
  }[tone];
  const textColor = {
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
    emerald: 'text-zinc-500',
  }[tone];

  return (
    <div
      className={
        compact
          ? 'mt-2'
          : 'mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 p-3'
      }
      title="Counts requests sent by this app since tracking was added. Earlier usage and requests from other clients are not included."
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          IndianAPI requests
        </span>
        <span className="text-xs font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {usage.used} / {usage.limit}
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className={`mt-1.5 text-[11px] ${textColor}`}>
        {rateLimited
          ? 'Last request rejected with 429 — the monthly quota may be exhausted. Searches fall back to Yahoo.'
          : `${usage.remaining} of ${usage.limit} left this month`}
      </p>

      {!compact && (
        <p className="mt-1 text-[10px] text-zinc-400">
          Counts requests since tracking was added.
        </p>
      )}
    </div>
  );
}
