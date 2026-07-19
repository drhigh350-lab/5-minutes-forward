import { NextRequest, NextResponse } from 'next/server';
import { getSiteSettingsAdmin, updateSiteSettingsAdmin } from '@/lib/adminData';

export async function GET() {
  try {
    const settings = await getSiteSettingsAdmin();
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const input = await req.json();
    await updateSiteSettingsAdmin(input);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 400 });
  }
}
