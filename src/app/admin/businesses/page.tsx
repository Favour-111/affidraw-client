'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { Button, Chips, EmptyState, ErrorState, PageTitle, Skeleton, cx } from '@/components/ui';
import { ReasonDialog, Table, Td } from '@/components/admin';

const STATUS: Record<string, [string, string]> = {
  PENDING: ['Awaiting approval', 'bg-warning-soft text-warning'], VERIFIED: ['Approved', 'bg-primary-soft text-primary-text'],
  REJECTED: ['Declined', 'bg-danger-soft text-danger'], UNVERIFIED: ['Unverified', 'bg-surface-2 text-muted'],
};

function TimeLeft({ due }: { due: string }) {
  const h = (new Date(due).getTime() - Date.now()) / 3600_000;
  return <span className={cx('text-meta font-semibold', h <= 0 ? 'text-danger' : h < 12 ? 'text-warning' : 'text-muted')}>{h <= 0 ? `Overdue by ${Math.ceil(-h)}h` : `${Math.floor(h)}h left`}</span>;
}

export default function Businesses() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-businesses'], queryFn: () => api<{ businesses: any[] }>('/admin/businesses'), refetchInterval: 60_000 });
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [rej, setRej] = useState<string | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-businesses'] }); qc.invalidateQueries({ queryKey: ['admin-overview'] }); };
  const verify = useMutation({ mutationFn: (id: string) => api(`/admin/businesses/${id}/verify`, { body: {} }), onSuccess: refresh });
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <Skeleton className="h-48 w-full" />;
  const pending = q.data.businesses.filter((b) => b.verificationStatus === 'PENDING');
  const rows = tab === 'pending' ? pending : q.data.businesses;
  return (
    <div>
      <PageTitle title="Businesses" sub="Approve or decline business accounts. Businesses can’t request campaigns until they’re approved." />
      <Chips className="mb-4" label="Filter businesses" value={tab} onChange={setTab} items={[{ id: 'pending', label: 'Pending approval', count: pending.length }, { id: 'all', label: 'All', count: q.data.businesses.length }]} />
      {rows.length === 0 ? <EmptyState title={tab === 'pending' ? 'Nothing waiting for review' : 'No businesses registered'} text={tab === 'pending' ? 'New business signups will appear here.' : undefined} /> : (
        <Table head={['Business', 'Owner', 'Contact', 'Reg. no.', 'Status', 'Submitted', '']}>
          {rows.map((b) => (
            <tr key={b.id}>
              <Td className="font-medium">{b.businessName}{!b.detailsSubmitted && <span className="block text-meta font-normal text-warning">Details not submitted yet</span>}</Td>
              <Td>{b.owner.name}<br /><span className="text-meta text-muted">{b.owner.email}</span></Td>
              <Td>{b.contactEmail}{b.contactPhone && <><br /><span className="text-meta text-muted">{b.contactPhone}</span></>}</Td>
              <Td>{b.registrationNumber ?? '—'}</Td>
              <Td><span className={cx('rounded-md px-2 py-0.5 text-meta font-semibold', STATUS[b.verificationStatus]?.[1])}>{STATUS[b.verificationStatus]?.[0] ?? b.verificationStatus}</span>{b.verificationStatus === 'REJECTED' && b.rejectionReason && <span className="mt-1 block max-w-[14rem] text-meta text-muted">{b.rejectionReason}</span>}</Td>
              <Td>{fmtDate(b.submittedAt)}{b.verificationStatus === 'PENDING' && <><br /><TimeLeft due={b.reviewDueAt} /></>}</Td>
              <Td><div className="flex gap-2">{b.verificationStatus !== 'VERIFIED' && <Button size="sm" loading={verify.isPending && verify.variables === b.id} onClick={() => verify.mutate(b.id)}>Approve</Button>}{b.verificationStatus !== 'REJECTED' && <Button size="sm" variant="danger" onClick={() => setRej(b.id)}>{b.verificationStatus === 'VERIFIED' ? 'Revoke' : 'Reject'}</Button>}</div></Td>
            </tr>
          ))}
        </Table>
      )}
      {rej && <ReasonDialog title="Decline business account" confirmLabel="Decline" onClose={() => setRej(null)} onConfirm={async (reason) => { await api(`/admin/businesses/${rej}/reject`, { body: { reason } }); refresh(); }} />}
    </div>
  );
}
