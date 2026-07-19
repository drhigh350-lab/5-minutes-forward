'use client';

import { useState } from 'react';
import Link from 'next/link';

const MENU_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/episodes', label: 'All Episodes' },
  { href: '/series', label: 'Series & Collections' },
  { href: '/explore', label: 'Explore' },
  { href: '/collective', label: 'Forward Collective' },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative flex items-center justify-between py-4">
      <Link href="/" className="font-display text-lg text-ink">
        5 Minutes Forward
      </Link>
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-navy-tint"
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 2L14 14M14 2L2 14" stroke="#14213D" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M1 4H17M1 9H17M1 14H17" stroke="#14213D" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open && (
        <nav className="absolute right-0 top-14 z-10 w-56 rounded-lg border border-line bg-surface shadow-lg py-2">
          {MENU_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-ink hover:bg-navy-tint"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
