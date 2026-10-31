'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { ErrorState, PageTitle, Skeleton } from '@/components/ui';
import { Pager, Table, Td } from '@/components/admin';

export default function Audit() {
  const [page, setPage] = useState(1);
  const r = useQuery({ queryKey: ['admin-audit', page], queryFn: () => api<{ logs: any[]; total: number; pageSize: number }>(`/admin/audit-logs?page=${page}&pageSize=30`), placeholderData: (p) => p });
  if (r.isError) return <ErrorState onRetry={() => r.refetch()} />;
  if (!r.data) return <Skeleton className="h-64 w-full" />;
  return (
    <div>
      <PageTitle title="Audit log" sub="Append-only. Entries cannot be edited or deleted." />
      <Table head={['When', 'Actor', 'Action', 'Entity', 'Details']}>
        {r.data.logs.map((l) => <tr key={l.id}><Td className="whitespace-nowrap">{fmtDate(l.createdAt)}</Td><Td>{l.actor?.name ?? 'system'}</Td><Td className="font-mono text-meta">{l.action}</Td><Td className="text-meta">{l.entityType}<br /><span className="text-muted">{l.entityId.slice(0, 10)}…</span></Td><Td className="max-w-xs break-words font-mono text-[11px] text-muted">{l.metadata ? JSON.stringify(l.metadata) : ''}</Td></tr>)}
      </Table>
      <Pager page={page} pageSize={r.data.pageSize} total={r.data.total} onPage={setPage} />
    </div>
  );
}
