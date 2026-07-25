import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer, WhatsAppFollow } from '@/components/LowerSections';
import { getSiteSettings } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Forward Collective — 5 Minutes Forward',
  description: 'A community of people building the five-minute habit together.',
};

export default async function CollectivePage() {
  const siteSettings = await getSiteSettings();

  return (
    <div className="mx-auto max-w-content px-5">
      <Header />
      <main>
        <section className="pt-4 pb-6">
          <p className="eyebrow mb-2">Community</p>
          <h1 className="font-display text-2xl text-ink leading-snug mb-4">Forward Collective</h1>
          <p className="text-ink font-display text-lg leading-snug mb-1">
            5 Minutes Forward helps you grow individually.
          </p>
          <p className="text-muted mb-6">
            The Forward Collective gives you people to grow with — a WhatsApp community built around the
            same five-minute habit, sharing what each episode brings up and holding each other to showing up.
          </p>

          {siteSettings.collectiveInviteUrl ? (
            <a
              href={siteSettings.collectiveInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-medium text-paper bg-ink rounded-full px-5 py-2.5 hover:bg-ink-soft transition-colors"
            >
              Join the Forward Collective
            </a>
          ) : (
            <p className="text-sm text-muted">Invite link coming soon.</p>
          )}
        </section>

        <WhatsAppFollow channelUrl={siteSettings.whatsappChannelUrl} />
      </main>
      <Footer />
    </div>
  );
}
