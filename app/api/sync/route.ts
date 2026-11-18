import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ success: false, error: 'Missing UID' }, { status: 400 });
    }

    if (!clientPromise) {
      return NextResponse.json({ success: false, error: 'MongoDB not configured' }, { status: 503 });
    }

    const client = await clientPromise;
    const db = client.db('portfolio_tracker');

    const userDoc = await db.collection('users').findOne({ uid: uid });

    if (!userDoc) {
      return NextResponse.json({ success: false, error: 'No user data found in MongoDB' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: userDoc });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, email, displayName } = body;

    if (!uid) {
      return NextResponse.json({ success: false, error: 'Missing UID' }, { status: 400 });
    }

    if (!clientPromise) {
      return NextResponse.json({ success: false, error: 'MongoDB not configured' }, { status: 503 });
    }

    const client = await clientPromise;
    const db = client.db('portfolio_tracker');

    const rawData =
      body.data && typeof body.data === 'object' && !Array.isArray(body.data)
        ? (body.data as Record<string, unknown>)
        : {};

    // SAFETY LOCK: Prevent accidental data wipes
    if (
      Array.isArray(rawData.assets) &&
      rawData.assets.length === 0 &&
      !rawData.forceClear
    ) {
      const existingUser = await db.collection('users').findOne({ uid: uid });
      if (existingUser && existingUser.assets && existingUser.assets.length > 0) {
        return NextResponse.json({ success: false, error: 'Safety lock: prevented overwriting populated portfolio with empty array. Use forceClear to bypass.' }, { status: 400 });
      }
    }

    // Copy top-level fields but protect identity fields and handle `settings`
    // separately so a partial settings write (e.g. only idealAllocation)
    // never wipes unrelated preferences.
    const update: Record<string, unknown> = {
      uid,
      lastSynced: new Date(),
    };
    // Identity fields are only rewritten by a non-empty value. Mobile sends
    // null when the auth profile lacks them, which must never erase what the
    // web app or a previous session stored.
    if (typeof email === 'string' && email.trim()) update.email = email.trim();
    if (typeof displayName === 'string' && displayName.trim()) {
      update.displayName = displayName.trim();
    }

    for (const [key, value] of Object.entries(rawData)) {
      if (
        [
          '_id',
          'uid',
          'settings',
          'forceClear',
          'lastSynced',
          '__proto__',
          'constructor',
          'prototype',
        ].includes(key)
      ) {
        continue;
      }
      if (key.startsWith('$')) continue;
      update[key] = value;
    }

    const settings = rawData.settings;
    if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
      for (const [key, value] of Object.entries(settings as Record<string, unknown>)) {
        if (!key || key.startsWith('$') || key.includes('.')) continue;
        update[`settings.${key}`] = value;
      }
    }

    // Update or insert the user document in MongoDB
    // We use the uid as the _id or just store it as a field. Let's store it as a field and use upsert.
    await db.collection('users').updateOne(
      { uid: uid },
      { $set: update },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
