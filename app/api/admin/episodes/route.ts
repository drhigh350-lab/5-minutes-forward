import { NextRequest, NextResponse } from 'next/server';
import { listEpisodesAdmin, createEpisode, getNextEpisodeNumber, EpisodeInput } from '@/lib/adminData';

export const runtime = 'edge';

export async function GET() {
  try {
    const episodes = await listEpisodesAdmin();
    const nextEpisodeNumber = await getNextEpisodeNumber();
    return NextResponse.json({ episodes, nextEpisodeNumber });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as EpisodeInput;
    const id = await createEpisode(input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 400 });
  }
}

function message(err: unknown) {
  return err instanceof Error ? err.message : 'Unknown error';
                             }
