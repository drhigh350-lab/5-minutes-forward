import Link from 'next/link';
import Image from 'next/image';
import { LogoutButton } from '@/components/admin/LogoutButton';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-line">
        <div className="mx-auto max-w-4xl px-5 py-3 flex items-center justify-between">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="flex items-center gap-2 font-display text-ink">
              <Image src="/logo.png" alt="" width={22} height={22} className="rounded-full" />
              Admin
            </Link>
            <Link href="/admin/episodes" className="text-muted hover:text-ink">
              Episodes
            </Link>
            <Link href="/admin/groupings" className="text-muted hover:text-ink">
              Groupings
            </Link>
            <Link href="/admin/feedback" className="text-muted hover:text-ink">
              Feedback
            </Link>
            <Link href="/admin/stats" className="text-muted hover:text-ink">
              Analytics
            </Link>
            <Link href="/admin/settings" className="text-muted hover:text-ink">
              Settings
            </Link>
          </nav>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-8 flex-1 w-full">{children}</main>
      <footer className="border-t border-line px-5 py-4 text-center text-xs text-muted">
        5 Minutes Forward — Powered by TECHMED
      </footer>
    </div>
  );
}
