'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { Button, EmptyState, ErrorState, PageTitle, Skeleton } from '@/components/ui';
import { ReasonDialog, Table, Td } from '@/components/admin';

export default function Businesses() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-businesses'], queryFn: () => api<{ businesses: any[] }>('/admin/businesses') });
  const [rej, setRej] = useState<string | null>(null);
  const verify = useMutation({ mutationFn: (id: string) => api(`/admin/businesses/${id}/verify`, { body: {} }), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-businesses'] }) });
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <Skeleton className="h-48 w-full" />;
  return (
    <div>
      <PageTitle title="Businesses" sub="Review sponsors before their campaigns can be published." />
      {q.data.businesses.length === 0 ? <EmptyState title="No businesses registered" /> : (
        <Table head={['Business', 'Owner', 'Reg. no.', 'Documents', 'Status', 'Registered', '']}>
          {q.data.businesses.map((b) => (
            <tr key={b.id}><Td className="font-medium">{b.businessName}</Td><Td>{b.owner.name}<br /><span className="text-meta text-muted">{b.owner.email}</span></Td><Td>{b.registrationNumber ?? '—'}</Td><Td>{b.documents.length}</Td><Td>{b.verificationStatus.toLowerCase()}</Td><Td>{fmtDate(b.createdAt)}</Td>
              <Td><div className="flex gap-2">{b.verificationStatus !== 'VERIFIED' && <Button size="sm" loading={verify.isPending && verify.variables === b.id} onClick={() => verify.mutate(b.id)}>Verify</Button>}{b.verificationStatus !== 'REJECTED' && <Button size="sm" variant="danger" onClick={() => setRej(b.id)}>Reject</Button>}</div></Td></tr>
          ))}
        </Table>
      )}
      {rej && <ReasonDialog title="Decline verification" confirmLabel="Decline" onClose={() => setRej(null)} onConfirm={async (reason) => { await api(`/admin/businesses/${rej}/reject`, { body: { reason } }); qc.invalidateQueries({ queryKey: ['admin-businesses'] }); }} />}
    </div>
  );
}
