import Link from 'next/link';
import { LogoutButton } from '@/components/admin/LogoutButton';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto max-w-4xl px-5 py-3 flex items-center justify-between">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="font-display text-ink">
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
      <main className="mx-auto max-w-4xl px-5 py-8">{children}</main>
    </div>
  );
}
