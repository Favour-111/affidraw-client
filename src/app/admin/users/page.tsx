'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { Button, ErrorState, PageTitle, Skeleton, inputCls } from '@/components/ui';
import { Pager, Table, Td } from '@/components/admin';

export default function Users() {
  const qc = useQueryClient();
  const [q, setQ] = useState(''); const [page, setPage] = useState(1);
  const r = useQuery({ queryKey: ['admin-users', q, page], queryFn: () => api<{ users: any[]; total: number; pageSize: number }>(`/admin/users?${new URLSearchParams({ q, page: String(page), pageSize: '20' })}`), placeholderData: (p) => p });
  const upd = useMutation({ mutationFn: ({ id, body }: { id: string; body: object }) => api(`/admin/users/${id}`, { method: 'PATCH', body }), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }) });
  return (
    <div>
      <PageTitle title="Users" />
      <input className={inputCls + ' mb-3 max-w-sm'} placeholder="Search name or email" aria-label="Search users" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      {r.isError ? <ErrorState onRetry={() => r.refetch()} /> : !r.data ? <Skeleton className="h-48 w-full" /> : (
        <>
          <Table head={['Name', 'Email', 'Role', 'Verification', 'Status', 'Joined', '']}>
            {r.data.users.map((u) => (
              <tr key={u.id}><Td className="font-medium">{u.name}</Td><Td>{u.email}</Td><Td>{u.role.toLowerCase()}</Td><Td>{u.verificationStatus.toLowerCase()}</Td><Td>{u.accountStatus.toLowerCase()}</Td><Td>{fmtDate(u.createdAt)}</Td>
                <Td><div className="flex gap-2">{u.verificationStatus !== 'VERIFIED' && <Button size="sm" variant="secondary" onClick={() => upd.mutate({ id: u.id, body: { verificationStatus: 'VERIFIED' } })}>Verify</Button>}<Button size="sm" variant={u.accountStatus === 'ACTIVE' ? 'danger' : 'secondary'} onClick={() => upd.mutate({ id: u.id, body: { accountStatus: u.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } })}>{u.accountStatus === 'ACTIVE' ? 'Suspend' : 'Reinstate'}</Button></div></Td></tr>
            ))}
          </Table>
          <Pager page={page} pageSize={r.data.pageSize} total={r.data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
