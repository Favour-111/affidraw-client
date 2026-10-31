'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { EmptyState, ErrorState, PageTitle, Skeleton, StatusBadge } from '@/components/ui';
import { Table, Td } from '@/components/admin';

export default function Draws() {
  const q = useQuery({ queryKey: ['admin-draws'], queryFn: () => api<{ draws: any[] }>('/admin/draws'), refetchInterval: 15_000 });
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <Skeleton className="h-48 w-full" />;
  return (
    <div>
      <PageTitle title="Draw management" sub="Draws appear here automatically when a campaign sells out." />
      {q.data.draws.length === 0 ? <EmptyState title="No draws yet" text="You’ll be notified when a campaign sells out." /> : (
        <Table head={['Campaign', 'Campaign status', 'Draw status', 'Broadcast', 'Scheduled', '']}>
          {q.data.draws.map((d) => (
            <tr key={d.id}><Td className="font-medium">{d.campaign.title}</Td><Td><StatusBadge status={d.campaign.status} /></Td><Td>{d.status.toLowerCase()}</Td><Td>{d.campaign.youtubeUrl ? 'Linked' : '—'}</Td><Td>{fmtDate(d.scheduledAt)}</Td>
              <Td><Link href={`/admin/draws/${d.id}`} className="font-semibold text-primary-text underline">Open</Link></Td></tr>
          ))}
        </Table>
      )}
    </div>
  );
}
