import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

const USER_ID = 'default_user'; // Hardcoded for single-user app until auth is added

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('portfolio_tracker');
    
    const user = await db.collection('users').findOne({ _id: USER_ID as any });
    
    return NextResponse.json(user || { assets: [], fundHoldings: {}, settings: {} });
  } catch (e: any) {
    console.error('Failed to fetch data from DB:', e);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db('portfolio_tracker');
    
    const updateDoc: any = {};
    
    if (body.assets !== undefined) {
      updateDoc.assets = body.assets;
    }
    
    if (body.fundHoldings !== undefined) {
      updateDoc.fundHoldings = body.fundHoldings;
    }
    
    if (body.settings) {
      for (const [key, value] of Object.entries(body.settings)) {
        updateDoc[`settings.${key}`] = value;
      }
    }

    if (Object.keys(updateDoc).length > 0) {
      await db.collection('users').updateOne(
        { _id: USER_ID as any },
        { $set: updateDoc },
        { upsert: true }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Failed to update data in DB:', e);
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}
