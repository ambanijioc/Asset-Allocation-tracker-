import { NextResponse } from 'next/server';
import { getIndianApiUsage } from '@/lib/indianapi-usage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const usage = await getIndianApiUsage();
  return NextResponse.json(usage, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
