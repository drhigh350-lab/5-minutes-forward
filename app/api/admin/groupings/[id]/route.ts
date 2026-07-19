import { NextRequest, NextResponse } from 'next/server';
import { updateGrouping, GroupingInput } from '@/lib/adminData';

// Next.js 15: route handler params are a Promise and must be awaited.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = (await req.json()) as GroupingInput;
    await updateGrouping(id, input);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 400 });
  }
}
