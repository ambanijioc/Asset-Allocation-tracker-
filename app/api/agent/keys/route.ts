import { NextResponse } from 'next/server';

import { resolveRequestUid } from '@/lib/agent-auth';
import {
  MAX_USER_KEYS,
  addStoredAiKey,
  deleteStoredAiKey,
  listKeyEntries,
  providerForNewKey,
  validateAiKey,
} from '@/lib/ai-keys';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4_096;

// Adding a key costs one provider validation call. Keep a small window so a
// signed-in client cannot hammer the provider through this endpoint.
const KEY_OPS_LIMIT = 10;
const KEY_OPS_WINDOW_MS = 10 * 60 * 1000;
const keyOpBuckets = new Map<string, { count: number; resetAt: number }>();

function isKeyOpLimited(uid: string): boolean {
  const now = Date.now();
  const bucket = keyOpBuckets.get(uid);
  if (!bucket || bucket.resetAt <= now) {
    keyOpBuckets.set(uid, { count: 1, resetAt: now + KEY_OPS_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > KEY_OPS_LIMIT;
}

export async function GET(request: Request) {
  const auth = await resolveRequestUid(request);
  if ('response' in auth) return auth.response;

  try {
    const result = await listKeyEntries(auth.uid);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[AGENT KEYS] Could not list keys:', error?.message || error);
    return NextResponse.json(
      { error: 'Could not load your AI keys. Try again in a moment.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
  }

  const auth = await resolveRequestUid(request);
  if ('response' in auth) return auth.response;

  if (isKeyOpLimited(auth.uid)) {
    return NextResponse.json(
      { error: 'Too many key changes. Wait a few minutes and try again.' },
      { status: 429 },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const key = typeof body?.key === 'string' ? body.key.trim() : '';
  const label = typeof body?.label === 'string' ? body.label : undefined;

  if (!key) {
    return NextResponse.json({ error: 'Paste an API key.' }, { status: 400 });
  }
  if (key.length < 20) {
    return NextResponse.json(
      { error: 'That key looks too short. Copy the full key from the provider.' },
      { status: 400 },
    );
  }
  if (key.length > 200) {
    return NextResponse.json({ error: 'That key is too long.' }, { status: 400 });
  }

  const provider = providerForNewKey(key, body?.provider);
  if (!provider) {
    return NextResponse.json(
      {
        error:
          'That key was not recognised. Use a Groq (gsk_…), OpenRouter (sk-or-v1-…) or Gemini (AIza…) key.',
      },
      { status: 400 },
    );
  }

  const validation = await validateAiKey(provider, key);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const result = await addStoredAiKey(auth.uid, provider, key, label);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(
      { key: result.entry, maxKeys: MAX_USER_KEYS },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('[AGENT KEYS] Could not save key:', error?.message || error);
    return NextResponse.json(
      { error: 'Could not save the key. Try again in a moment.' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await resolveRequestUid(request);
  if ('response' in auth) return auth.response;

  if (isKeyOpLimited(auth.uid)) {
    return NextResponse.json(
      { error: 'Too many key changes. Wait a few minutes and try again.' },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const id = (searchParams.get('id') || '').trim();

  if (!id) {
    return NextResponse.json({ error: 'Choose a key to remove.' }, { status: 400 });
  }
  if (id.startsWith('env-')) {
    return NextResponse.json(
      { error: 'Server environment keys are managed outside the app.' },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteStoredAiKey(auth.uid, id);
    if (!deleted) {
      return NextResponse.json({ error: 'That key was not found.' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    console.error('[AGENT KEYS] Could not delete key:', error?.message || error);
    return NextResponse.json(
      { error: 'Could not remove the key. Try again in a moment.' },
      { status: 500 },
    );
  }
}
