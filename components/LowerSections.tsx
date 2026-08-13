import Link from 'next/link';
import Image from 'next/image';

export function ExploreTeaser({ title, slug, isPopular }: { title: string; slug: string; isPopular: boolean }) {
  return (
    <section className="py-4 border-t border-line">
      <Link href="/explore" className="flex items-center justify-between text-sm group">
        <span className="text-muted">
          {isPopular && <span className="mr-1.5">🔥</span>}
          Popular right now: <span className="text-ink">{title}</span>
        </span>
        <span className="text-muted group-hover:text-ink shrink-0 ml-3">See more →</span>
      </Link>
    </section>
  );
}

export function CollectiveSection({ inviteUrl }: { inviteUrl: string }) {
  if (!inviteUrl) return null;
  return (
    <section className="py-8 border-t border-line">
      <p className="text-ink font-display text-lg leading-snug mb-1">
        5 Minutes Forward helps you grow individually.
      </p>
      <p className="text-muted mb-5">The Forward Collective gives you people to grow with.</p>
      <a
        href={inviteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm font-medium text-paper bg-ink rounded-full px-5 py-2.5 hover:bg-ink-soft transition-colors"
      >
        Join the Forward Collective
      </a>
    </section>
  );
}

export function WhatsAppFollow({ channelUrl }: { channelUrl: string }) {
  if (!channelUrl) return null;
  return (
    <section className="py-5 border-t border-line">
      <p className="text-sm text-muted">
        Stay close to the next episode.{' '}
        <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="text-ink underline decoration-line underline-offset-4">
          Follow on WhatsApp
        </a>
      </p>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="py-8 border-t border-line mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Image src="/logo.png" alt="" width={22} height={22} className="rounded-full" />
        <p className="font-display text-sm text-ink">
          5 Minutes Forward · Forward Collective
        </p>
      </div>
      <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted mb-4">
        <Link href="/" className="hover:text-ink">Home</Link>
        <Link href="/episodes" className="hover:text-ink">All Episodes</Link>
        <Link href="/series" className="hover:text-ink">Series</Link>
        <Link href="/collective" className="hover:text-ink">Forward Collective</Link>
        <Link href="/feedback" className="hover:text-ink">Feedback</Link>
      </nav>
      <p className="text-xs text-muted">
        Powered by TECHMED · © {new Date().getFullYear()} TECHMED
      </p>
    </footer>
  );
}
