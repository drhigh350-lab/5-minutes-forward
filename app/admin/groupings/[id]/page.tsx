import { notFound } from 'next/navigation';
import { listGroupingsAdmin } from '@/lib/adminData';
import { GroupingForm } from '@/components/admin/GroupingForm';

// Next.js 15: page params are a Promise and must be awaited.
export default async function EditGroupingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const groupings = await listGroupingsAdmin();
  const grouping = groupings.find((g) => g.id === id);
  if (!grouping) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink mb-6">Edit Grouping</h1>
      <GroupingForm
        mode="edit"
        groupingId={grouping.id}
        initial={{
          title: grouping.title,
          slug: grouping.slug,
          description: grouping.description ?? '',
          type: grouping.type,
          status: grouping.status ?? '',
          isOrdered: grouping.is_ordered,
          artworkUrl: grouping.artwork_url ?? '',
          displayOrder: grouping.display_order ?? '',
          featured: grouping.featured,
        }}
      />
    </div>
  );
}
