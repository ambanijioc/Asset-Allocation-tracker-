import { NextResponse } from 'next/server';

// Force dynamic so Render actually processes the request instead of serving a cached response
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}
