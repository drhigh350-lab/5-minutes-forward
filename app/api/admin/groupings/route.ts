import { NextRequest, NextResponse } from 'next/server';
import { listGroupingsAdmin, createGrouping, GroupingInput } from '@/lib/adminData';

export async function GET() {
  try {
    const groupings = await listGroupingsAdmin();
    return NextResponse.json({ groupings });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as GroupingInput;
    const id = await createGrouping(input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 400 });
  }
}

function message(err: unknown) {
  return err instanceof Error ? err.message : 'Unknown error';
}
