/** True when data is older than `maxAgeMs`, or has no usable timestamp. */
export function isStale(
  timestamp: number | null | undefined,
  maxAgeMs: number,
  now: number = Date.now(),
): boolean {
  if (timestamp == null || !Number.isFinite(timestamp) || timestamp <= 0) return true;
  return now - timestamp > maxAgeMs;
}

/** Compact relative time for sync status: "just now", "4m ago", "2h ago". */
export function formatRelativeTime(
  timestamp: number | null | undefined,
  now: number = Date.now(),
): string {
  if (timestamp == null || !Number.isFinite(timestamp) || timestamp <= 0) return '';

  const diffMs = Math.max(0, now - timestamp);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;

  try {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return `${days}d ago`;
  }
}
