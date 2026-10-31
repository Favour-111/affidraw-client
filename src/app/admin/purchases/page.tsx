'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fmtDate, naira } from '@/lib/format';
import { ErrorState, PageTitle, Skeleton, inputCls } from '@/components/ui';
import { Pager, Table, Td } from '@/components/admin';

export default function AdminPurchases() {
  const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const r = useQuery({ queryKey: ['admin-purchases', status, page], queryFn: () => api<{ purchases: any[]; total: number; pageSize: number }>(`/admin/purchases?${new URLSearchParams({ status, page: String(page), pageSize: '20' })}`), placeholderData: (p) => p });
  return (
    <div>
      <PageTitle title="Purchases & payments" sub="Anything in “refund required” needs attention if it persists." />
      <select className={inputCls + ' mb-3 max-w-xs'} aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option>{['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUND_REQUIRED', 'REFUNDED'].map((s) => <option key={s} value={s}>{s.replace('_', ' ').toLowerCase()}</option>)}</select>
      {r.isError ? <ErrorState onRetry={() => r.refetch()} /> : !r.data ? <Skeleton className="h-48 w-full" /> : (
        <>
          <Table head={['Buyer', 'Campaign', 'Qty', 'Amount', 'Purchase', 'Payment', 'Reference', 'Date']}>
            {r.data.purchases.map((p) => <tr key={p.id}><Td>{p.user.name}</Td><Td>{p.campaign.title}</Td><Td>{p.quantity}</Td><Td>{naira(p.totalAmount)}</Td><Td>{p.status.toLowerCase()}</Td><Td>{p.payment?.status.toLowerCase()}</Td><Td className="font-mono text-meta">{p.payment?.providerReference}</Td><Td>{fmtDate(p.createdAt)}</Td></tr>)}
          </Table>
          <Pager page={page} pageSize={r.data.pageSize} total={r.data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
