import { NextResponse } from 'next/server';

import { verifyFirebaseIdToken } from '@/lib/firebase-auth';

export const runtime = 'nodejs';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const ALLOWED_MODELS = new Set(['openai/gpt-oss-120b', 'openai/gpt-oss-20b']);
const MAX_MESSAGES = 40;
const MAX_BODY_BYTES = 120_000;

// Free-tier requests are cheap but finite. Keep a small per-user window so a
// runaway tool loop cannot burn the whole daily quota in one conversation.
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(uid: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(uid);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(uid, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_portfolio_summary',
      description:
        "The user's current portfolio: total value, invested amount, profit/loss, allocation by category, and every holding with its weight. Use this before answering any question about the user's own money.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_exposure_summary',
      description:
        'Sector and market-cap exposure across the whole portfolio, including stocks held indirectly through mutual funds and ETFs. Use for questions like "how much IT exposure do I have?".',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_asset',
      description:
        'Search for a stock, ETF or mutual fund by name or ticker. Returns matching symbols and names. Use this when the user names an asset but you do not know its exact symbol.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Company or fund name, or a ticker symbol.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_quote',
      description:
        'Latest market price for one symbol (for example RELIANCE.NS, AAPL, BTC-USD).',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Exact Yahoo-style ticker symbol.' },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_fund_holdings',
      description:
        'Underlying stocks and sector weights for a mutual fund or ETF. Indian ETFs may return an index look-through rather than the exact portfolio; say so when the note indicates it.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Fund or ETF symbol, e.g. MF_140084 or NIFTYBEES.NS.' },
          name: { type: 'string', description: 'Fund name, to help resolve the right scheme.' },
        },
        required: ['symbol'],
      },
    },
  },
];

function systemPrompt() {
  const today = new Date().toISOString().slice(0, 10);
  return [
    'You are the portfolio assistant inside the Asset Allocation Tracker mobile app.',
    `Today is ${today}. All portfolio values are in Indian rupees (INR).`,
    '',
    'Rules:',
    '- Use the provided tools for facts. Never invent prices, holdings, weights or returns.',
    "- Call get_portfolio_summary before answering questions about the user's own portfolio.",
    '- Call get_exposure_summary for sector or market-cap questions.',
    '- Call search_asset first when you are unsure of an exact ticker.',
    '- Fund and ETF holdings may come from an index look-through. Mention that caveat when the note says so.',
    '- Format money with Indian digit grouping (for example ₹12,34,567). Keep answers under 180 words unless the user asks for detail.',
    '- Write for a small mobile chat screen: plain text only. Do not use Markdown bold/italics, headings, tables or code blocks. Simple "-" bullets and short paragraphs are fine.',
    '- You are read-only. You cannot add, edit or delete assets. If asked, say write actions are not available yet and point the user to the Assets tab.',
    '- If a tool fails or returns no data, say so plainly. Never fill gaps with made-up numbers.',
    '- Ask a short clarifying question when the request is ambiguous.',
  ].join('\n');
}

type SanitizedMessage = {
  role: 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
  name?: string;
};

function sanitizeMessages(input: unknown): SanitizedMessage[] {
  if (!Array.isArray(input)) return [];

  const messages: SanitizedMessage[] = [];
  for (const raw of input.slice(-MAX_MESSAGES)) {
    const item = raw as any;
    const role = item?.role;
    if (role !== 'user' && role !== 'assistant' && role !== 'tool') continue;

    const message: SanitizedMessage = {
      role,
      content:
        typeof item.content === 'string'
          ? item.content.slice(0, 8000)
          : item.content == null
            ? role === 'assistant'
              ? null
              : ''
            : String(item.content).slice(0, 8000),
    };

    if (Array.isArray(item.tool_calls)) {
      message.tool_calls = item.tool_calls.slice(0, 4).map((call: any, index: number) => {
        const args = call?.function?.arguments;
        return {
          id: String(call?.id || `call_${index}`),
          type: 'function',
          function: {
            name: String(call?.function?.name || ''),
            arguments:
              typeof args === 'string' ? args.slice(0, 4000) : JSON.stringify(args ?? {}),
          },
        };
      });
    }

    if (typeof item.tool_call_id === 'string') {
      message.tool_call_id = item.tool_call_id.slice(0, 200);
    }
    if (typeof item.name === 'string') {
      message.name = item.name.slice(0, 100);
    }

    messages.push(message);
  }

  return messages;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Conversation is too large.' }, { status: 413 });
  }

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;

  let uid = 'development';
  if (token) {
    try {
      const user = await verifyFirebaseIdToken(token);
      if (!user) {
        return NextResponse.json({ error: 'Your session expired. Please sign in again.' }, { status: 401 });
      }
      uid = user.uid;
    } catch (error: any) {
      console.warn('[AGENT] Firebase token verification failed:', error?.message || error);
      return NextResponse.json(
        { error: 'Could not verify your session. Please sign in again.' },
        { status: 401 },
      );
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Sign in to use the assistant.' }, { status: 401 });
  }

  if (isRateLimited(uid)) {
    return NextResponse.json(
      { error: 'Too many assistant requests. Wait a few minutes and try again.' },
      { status: 429 },
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'The assistant is not configured yet (GROQ_API_KEY is missing).' },
      { status: 503 },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const messages = sanitizeMessages(body?.messages);
  if (messages.length === 0) {
    return NextResponse.json({ error: 'Send at least one message.' }, { status: 400 });
  }

  const requestedModel = typeof body?.model === 'string' ? body.model : '';
  const model = ALLOWED_MODELS.has(requestedModel) ? requestedModel : DEFAULT_MODEL;

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt() }, ...messages],
        tools: TOOLS,
        tool_choice: 'auto',
        max_completion_tokens: 1600,
      }),
      signal: AbortSignal.timeout(45_000),
      cache: 'no-store',
    });

    const text = await response.text();
    let payload: any = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const providerMessage = payload?.error?.message || payload?.error || text.slice(0, 200);
      console.error(`[AGENT] Groq error (${response.status}):`, String(providerMessage).slice(0, 300));

      if (response.status === 429) {
        return NextResponse.json(
          { error: 'The AI provider is rate-limiting us right now. Try again in a minute.' },
          { status: 429 },
        );
      }
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: 'The AI provider rejected the server key. Check GROQ_API_KEY.' },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { error: 'The AI provider could not answer. Try again shortly.' },
        { status: 502 },
      );
    }

    const message = payload?.choices?.[0]?.message;
    if (!message) {
      return NextResponse.json({ error: 'The AI provider returned an empty response.' }, { status: 502 });
    }

    return NextResponse.json({
      message,
      model: payload?.model || model,
      usage: payload?.usage ?? null,
    });
  } catch (error: any) {
    console.error('[AGENT] Request failed:', error?.message || error);
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    return NextResponse.json(
      { error: timedOut ? 'The assistant took too long to answer. Try again.' : 'Could not reach the AI provider.' },
      { status: timedOut ? 504 : 502 },
    );
  }
}
