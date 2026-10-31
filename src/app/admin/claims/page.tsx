'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { EmptyState, ErrorState, PageTitle, Skeleton, inputCls } from '@/components/ui';
import { Table, Td } from '@/components/admin';

const STATUSES = ['PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'FULFILMENT_IN_PROGRESS', 'FULFILLED'];

export default function Claims() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-claims'], queryFn: () => api<{ claims: any[] }>('/admin/prize-claims') });
  const upd = useMutation({ mutationFn: ({ id, body }: { id: string; body: object }) => api(`/admin/prize-claims/${id}`, { method: 'PATCH', body }), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-claims'] }) });
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <Skeleton className="h-48 w-full" />;
  return (
    <div>
      <PageTitle title="Prize claims" sub="Winner verification and fulfilment. Contact details are visible to admins only." />
      {q.data.claims.length === 0 ? <EmptyState title="No claims yet" text="A claim is created automatically when a result is published." /> : (
        <Table head={['Campaign', 'Winner', 'Status', 'Delivery note', 'Created']}>
          {q.data.claims.map((c) => (
            <tr key={c.id}>
              <Td className="font-medium">{c.campaign.title}</Td>
              <Td>{c.winner.name}<br /><span className="text-meta text-muted">{c.winner.email}{c.winner.phone ? ` · ${c.winner.phone}` : ''}</span></Td>
              <Td><select aria-label={`Claim status for ${c.campaign.title}`} className={inputCls + ' h-9 text-label'} value={c.status} onChange={(e) => upd.mutate({ id: c.id, body: { status: e.target.value } })}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ').toLowerCase()}</option>)}</select></Td>
              <Td><input aria-label="Delivery status note" className={inputCls + ' h-9 text-label'} defaultValue={c.deliveryStatus ?? ''} placeholder="e.g. Collected 12 Nov" onBlur={(e) => e.target.value !== (c.deliveryStatus ?? '') && upd.mutate({ id: c.id, body: { deliveryStatus: e.target.value } })} /></Td>
              <Td>{fmtDate(c.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
