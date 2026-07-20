import { NextRequest, NextResponse } from 'next/server';
import { listFeedbackAdmin } from '@/lib/adminData';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const episodeId = req.nextUrl.searchParams.get('episodeId') ?? undefined;
    const feedback = await listFeedbackAdmin(episodeId);
    return NextResponse.json({ feedback });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
