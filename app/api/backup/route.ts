import { NextResponse } from 'next/server';
import fs from 'fs';

const BACKUP_PATH = '/tmp/old_assets.json';

export async function GET() {
  if (!fs.existsSync(BACKUP_PATH)) {
    return NextResponse.json(
      { success: false, error: 'No legacy backup file found on this server.' },
      { status: 404 },
    );
  }

  try {
    const data = fs.readFileSync(BACKUP_PATH, 'utf8');
    return NextResponse.json({ success: true, data: JSON.parse(data) });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
