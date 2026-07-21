import { NextRequest, NextResponse } from 'next/server';
import { getEpisodeAdmin, updateEpisode, EpisodeInput } from '@/lib/adminData';

export const runtime = 'edge';

// Next.js 15: route handler params are a Promise and must be awaited.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await getEpisodeAdmin(id);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = (await req.json()) as EpisodeInput;
    await updateEpisode(id, input);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 400 });
  }
}

function message(err: unknown) {
  return err instanceof Error ? err.message : 'Unknown error';
}
