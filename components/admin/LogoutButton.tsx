'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  return (
    <button type="button" onClick={handleLogout} className="text-xs text-muted hover:text-ink">
      Sign out
    </button>
  );
}
