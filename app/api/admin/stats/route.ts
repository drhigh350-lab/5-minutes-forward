import { NextResponse } from 'next/server';
import { getStatsOverviewAdmin } from '@/lib/adminData';

export async function GET() {
  try {
    const stats = await getStatsOverviewAdmin();
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
