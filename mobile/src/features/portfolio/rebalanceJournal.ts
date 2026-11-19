import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/src/features/auth/AuthProvider';

/**
 * Local audit trail for executed rebalance plans. Holdings are the source of
 * truth for allocation, so marking a plan complete records the date and sizes
 * but never rewrites positions. Drift keeps reflecting what is actually owned
 * until the user updates the holdings.
 */
export interface RebalanceRecord {
  id: string;
  completedAt: string;
  contribution: number;
  bought: number;
  sold: number;
  projectedWorstDriftPp: number;
  policyVersion: number;
  sleeveCount: number;
}

export type NewRebalanceRecord = Omit<RebalanceRecord, 'id' | 'completedAt'>;

const STORAGE_PREFIX = 'asset-tracker/rebalances';
const MAX_RECORDS = 8;

interface JournalState {
  /** Scope whose records have been loaded; null until the first read lands. */
  scope: string | null;
  records: RebalanceRecord[];
}

function isRecord(value: unknown): value is RebalanceRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<RebalanceRecord>;
  return (
    typeof record.id === 'string' &&
    typeof record.completedAt === 'string' &&
    Number.isFinite(record.contribution) &&
    Number.isFinite(record.bought) &&
    Number.isFinite(record.sold) &&
    Number.isFinite(record.projectedWorstDriftPp) &&
    Number.isFinite(record.policyVersion) &&
    Number.isFinite(record.sleeveCount)
  );
}

function parseRecords(raw: string | null): RebalanceRecord[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord).slice(0, MAX_RECORDS);
  } catch {
    return [];
  }
}

export function useRebalanceJournal() {
  const { uid, isDemo } = useAuth();
  const scope = isDemo ? 'demo' : uid;
  const [state, setState] = useState<JournalState>({
    scope: null,
    records: [],
  });

  useEffect(() => {
    if (!scope) return;
    let cancelled = false;

    AsyncStorage.getItem(`${STORAGE_PREFIX}/${scope}`)
      .then((raw) => {
        if (cancelled) return;
        setState({ scope, records: parseRecords(raw) });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ scope, records: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [scope]);

  // A scope mismatch means the current user's records have not loaded yet, so
  // never show another scope's history in the meantime.
  const records = state.scope === scope ? state.records : [];
  const isLoading = Boolean(scope) && state.scope !== scope;

  const record = useCallback(
    async (entry: NewRebalanceRecord): Promise<RebalanceRecord | null> => {
      if (!scope) return null;
      const next: RebalanceRecord = {
        ...entry,
        id: `rebalance-${Date.now().toString(36)}`,
        completedAt: new Date().toISOString(),
      };
      const current = state.scope === scope ? state.records : [];
      const updated = [next, ...current].slice(0, MAX_RECORDS);
      setState({ scope, records: updated });
      await AsyncStorage.setItem(
        `${STORAGE_PREFIX}/${scope}`,
        JSON.stringify(updated),
      ).catch(() => {});
      return next;
    },
    [scope, state],
  );

  return {
    records,
    lastRecord: records[0] ?? null,
    isLoading,
    record,
  };
}
