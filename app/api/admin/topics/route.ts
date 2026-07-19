import { NextRequest, NextResponse } from 'next/server';
import { listTopics, createTopic } from '@/lib/adminData';

export async function GET() {
  try {
    const topics = await listTopics();
    return NextResponse.json({ topics });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, slug } = await req.json();
    const id = await createTopic(name, slug);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 400 });
  }
}
