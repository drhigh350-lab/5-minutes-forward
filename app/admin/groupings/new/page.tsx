import { GroupingForm } from '@/components/admin/GroupingForm';

export default function NewGroupingPage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-ink mb-6">New Grouping</h1>
      <GroupingForm mode="create" />
    </div>
  );
}
