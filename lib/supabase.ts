import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Generated shape kept minimal/hand-written here rather than via
// `supabase gen types` (would require CLI + network) — see lib/types.ts
// for the app-facing shapes; this file only needs enough to type client
// creation safely. Regenerate properly once `supabase` CLI is available:
//   npx supabase gen types typescript --project-id nourqoxqgxaulfstdgwn
export type Database = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Public client — anon/publishable key, subject to RLS. Safe to use in
 * both client and server components. This is the ONLY client that
 * should ever be created in code that runs in the browser.
 */
export function createPublicClient(): SupabaseClient<Database> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — check .env.local against .env.example'
    );
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Admin client — service role key, BYPASSES ROW LEVEL SECURITY entirely.
 *
 * SERVER-ONLY. Must never be imported by any file that can end up in a
 * client bundle (anything under 'use client', or imported by one). Only
 * call this from app/api/admin/** route handlers, which already sit
 * behind the admin session check in middleware.ts.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — check .env.local against .env.example'
    );
  }
  return createClient<Database>(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
