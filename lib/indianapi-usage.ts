import clientPromise from '@/lib/mongodb';

/**
 * IndianAPI's free plan allows 500 requests per month and its responses do not
 * include quota headers, so the app keeps its own counter. The counter is
 * shared (it lives in MongoDB) because the API key is shared too.
 */
export const INDIANAPI_MONTHLY_LIMIT = (() => {
  const raw = Number(process.env.INDIAN_API_MONTHLY_LIMIT || 500);
  return Number.isFinite(raw) && raw > 0 ? raw : 500;
})();

const COLLECTION = 'api_usage';
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
});

/** Calendar month in IST, matching the IndianAPI dashboard's cycle. */
export function currentUsageMonth(date = new Date()): string {
  const parts = MONTH_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '00';
  return `${year}-${month}`;
}

interface UsageDocument {
  _id: string;
  month?: string;
  used?: number;
  lastStatus?: number | null;
  lastStatusAt?: Date | null;
  updatedAt?: Date;
}

export interface IndianApiUsage {
  configured: boolean;
  month: string;
  used: number;
  limit: number;
  remaining: number;
  lastStatus: number | null;
  lastStatusAt: string | null;
}

function usageId(month = currentUsageMonth()) {
  return `indianapi:${month}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('MongoDB timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function getCollection() {
  if (!clientPromise) return null;
  const client = await withTimeout(clientPromise, 5000);
  return client.db('portfolio_tracker').collection<UsageDocument>(COLLECTION);
}

/**
 * Record one request that was sent to IndianAPI. Fire-and-forget: a usage
 * tracking failure must never break search.
 */
export async function recordIndianApiRequest(status: number): Promise<void> {
  if (!clientPromise) return;

  try {
    const collection = await getCollection();
    if (!collection) return;

    const month = currentUsageMonth();
    await collection.updateOne(
      { _id: usageId(month) },
      {
        $inc: { used: 1 },
        $set: { lastStatus: status, lastStatusAt: new Date(), updatedAt: new Date() },
        $setOnInsert: { month },
      },
      { upsert: true },
    );
  } catch (error) {
    console.warn('[IndianAPI usage] failed to record request:', error);
  }
}

export async function getIndianApiUsage(): Promise<IndianApiUsage> {
  const month = currentUsageMonth();
  const limit = INDIANAPI_MONTHLY_LIMIT;
  const empty: IndianApiUsage = {
    configured: Boolean(clientPromise),
    month,
    used: 0,
    limit,
    remaining: limit,
    lastStatus: null,
    lastStatusAt: null,
  };

  if (!clientPromise) return empty;

  try {
    const collection = await getCollection();
    if (!collection) return empty;

    const doc = await collection.findOne({ _id: usageId(month) });
    const used = Math.max(0, Number(doc?.used) || 0);

    return {
      configured: true,
      month,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      lastStatus: doc?.lastStatus ?? null,
      lastStatusAt: doc?.lastStatusAt instanceof Date ? doc.lastStatusAt.toISOString() : null,
    };
  } catch (error) {
    console.warn('[IndianAPI usage] failed to read usage:', error);
    // Don't show a misleading "0 / 500" when the counter is unreachable.
    return { ...empty, configured: false };
  }
}
