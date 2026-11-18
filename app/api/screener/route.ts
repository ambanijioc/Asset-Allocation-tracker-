import { NextResponse } from 'next/server';

/**
 * Tickertape migrated its screener API to a new query schema:
 *
 *   old: { filters: [{ id, op, val }], sort, order, limit }
 *   new: { match: { field: { g, l } | [values] }, sortBy, sortOrder, count }
 *
 * The old fields are silently ignored, which used to return an unsorted,
 * unfiltered list. Keep the public contract used by the web and mobile clients
 * and translate it here.
 */

type LegacyFilter = {
  id?: string;
  op?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between' | string;
  val?: number | string | [number, number];
};

type NumericBound = { g?: number; l?: number };
type Match = Record<string, NumericBound | (string | number)[]>;

/**
 * Client field -> Tickertape field. `marketCap` stays in millions at the
 * boundary (the web's presets and historical response use millions); the
 * Tickertape field `mrktCapf` is in crores, so it is scaled when building the
 * query and converted back when shaping the response.
 */
const FIELD_MAP: Record<string, string> = {
  marketCap: 'mrktCapf',
  peRatio: 'apef',
  pbRatio: 'pbr',
  divYield: 'divYield',
  sector: 'sector',
  subindustry: 'subindustry',
  price: 'lastPrice',
};

/** Categorical fields use string equality arrays in the new schema. */
const STRING_FIELDS = new Set(['sector', 'subindustry']);

const PROJECT = [
  'sid',
  'ticker',
  'name',
  'sector',
  'subindustry',
  'mrktCapf',
  'apef',
  'pbr',
  'divYield',
  'lastPrice',
  'pr1d',
  '4wpct',
];

const asNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined;
};

const tickertapeField = (id: string): string => FIELD_MAP[id] ?? id;

/** Legacy filter values for market caps are in millions; mrktCapf is crores. */
const scaleForTickertape = (id: string, value: number): number =>
  id === 'marketCap' ? value / 10 : value;

function addBound(match: Match, field: string, key: 'g' | 'l', value: number) {
  const current = match[field];
  if (current && !Array.isArray(current)) {
    const existing = current[key];
    current[key] = existing === undefined ? value : key === 'g' ? Math.max(existing, value) : Math.min(existing, value);
    return;
  }
  match[field] = { [key]: value };
}

function addEquals(match: Match, field: string, value: string | number) {
  const current = match[field];
  if (Array.isArray(current)) {
    if (!current.includes(value)) current.push(value);
    return;
  }
  match[field] = [value];
}

function buildMatch(filters: LegacyFilter[], match: Match = {}): Match {
  for (const filter of filters) {
    if (!filter?.id) continue;
    const field = tickertapeField(filter.id);
    const { op, val } = filter;

    if (op === 'eq') {
      if (val === undefined || Array.isArray(val)) continue;
      addEquals(match, field, STRING_FIELDS.has(filter.id) ? String(val) : val);
      continue;
    }

    if (op === 'between') {
      if (!Array.isArray(val)) continue;
      const [min, max] = val;
      addBound(match, field, 'g', scaleForTickertape(filter.id, Number(min)));
      addBound(match, field, 'l', scaleForTickertape(filter.id, Number(max)));
      continue;
    }

    const numeric = asNumber(val);
    if (numeric === undefined || Array.isArray(val)) continue;
    const scaled = scaleForTickertape(filter.id, numeric);

    if (op === 'gt' || op === 'gte') addBound(match, field, 'g', scaled);
    else if (op === 'lt' || op === 'lte') addBound(match, field, 'l', scaled);
  }

  return match;
}

/** Convert new Tickertape fields back to the response shape clients expect. */
function normalizeResponse(payload: any) {
  const rows = Array.isArray(payload?.data?.results) ? payload.data.results : [];

  const results = rows.map((row: any) => {
    const ratios = row?.stock?.advancedRatios ?? {};
    const marketCapInCrores = asNumber(ratios.mrktCapf);
    const peRatio = asNumber(ratios.apef);
    const pbRatio = asNumber(ratios.pbr);
    const price = asNumber(ratios.lastPrice);
    const percentChange = asNumber(ratios.pr1d);
    const flat: Record<string, number> = {};

    const advancedRatios = {
      ...ratios,
      ...(marketCapInCrores !== undefined ? { marketCap: marketCapInCrores * 10 } : {}),
      ...(peRatio !== undefined ? { peRatio } : {}),
      ...(pbRatio !== undefined ? { pbRatio } : {}),
    };

    if (marketCapInCrores !== undefined) flat.marketCap = marketCapInCrores * 10;
    if (peRatio !== undefined) flat.peRatio = peRatio;
    if (pbRatio !== undefined) flat.pbRatio = pbRatio;
    if (price !== undefined) flat.price = price;
    if (percentChange !== undefined) flat.pchange = percentChange;

    return {
      ...row,
      ...flat,
      stock: row?.stock ? { ...row.stock, advancedRatios } : row?.stock,
    };
  });

  return {
    ...payload,
    data: {
      ...(payload?.data ?? {}),
      results,
    },
  };
}

async function queryTickertape(url: string, body: unknown) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://www.tickertape.in',
      'Referer': 'https://www.tickertape.in/screener',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const legacyFilters: LegacyFilter[] = Array.isArray(body?.filters) ? body.filters : [];

    const sortBy = tickertapeField(typeof body?.sort === 'string' ? body.sort : 'marketCap');
    const sortOrder = Number(body?.order) === 1 ? 1 : -1;

    const match = buildMatch(legacyFilters);
    // Preserve the tool's historical default universe: listed equities only.
    if (!match.mrktCapf) match.mrktCapf = { g: 0 };
    // Sorting by a ratio is only meaningful for positive values; otherwise the
    // first page fills with ETFs, shells and companies missing the ratio.
    if (sortBy === 'apef') addBound(match, 'apef', 'g', 1);
    if (sortBy === 'divYield') addBound(match, 'divYield', 'g', 0);

    const requestedLimit = asNumber(body?.limit) ?? asNumber(body?.count) ?? 20;
    const count = Math.min(100, Math.max(1, Math.round(requestedLimit)));
    const offset = Math.max(0, Math.round(asNumber(body?.offset) ?? 0));

    const query = {
      match,
      sortBy,
      sortOrder,
      offset,
      count,
      project: PROJECT,
    };

    const tickertapeUrl = 'https://api.tickertape.in/screener/query';
    console.log(`Fetching from Tickertape: ${tickertapeUrl}`, JSON.stringify(query));

    let response = await queryTickertape(tickertapeUrl, query);

    if (!response.ok && response.status === 404) {
      const v2Url = 'https://api.tickertape.in/v2/screener/query';
      console.log(`Retrying with fallback: ${v2Url}`);
      response = await queryTickertape(v2Url, query);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Tickertape API error: ${response.status}`, errorText);
      return NextResponse.json(
        {
          error: `Tickertape API error: ${response.status}`,
          details: errorText,
          attemptedUrl: tickertapeUrl,
        },
        { status: response.status },
      );
    }

    const data = await response.json();

    if (data?.success === false) {
      return NextResponse.json(
        { error: data?.error || 'Tickertape rejected the screener query', details: data },
        { status: 502 },
      );
    }

    return NextResponse.json(normalizeResponse(data));
  } catch (error: any) {
    console.error('Screener API error:', error);
    return NextResponse.json({ error: error?.message ?? 'Screener request failed' }, { status: 500 });
  }
}
