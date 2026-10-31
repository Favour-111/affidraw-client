'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fmtDate, naira, STATUS_LABEL } from '@/lib/format';
import { ErrorState, LinkButton, PageTitle, Skeleton, StatusBadge, inputCls } from '@/components/ui';
import { Pager, Table, Td } from '@/components/admin';

export default function AdminCampaigns() {
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [sort, setSort] = useState('createdAt'); const [page, setPage] = useState(1);
  const r = useQuery({ queryKey: ['admin-campaigns', q, status, sort, page], queryFn: () => api<{ campaigns: any[]; total: number; pageSize: number }>(`/admin/campaigns?${new URLSearchParams({ q, status, sort, page: String(page), pageSize: '15' })}`), placeholderData: (p) => p });
  return (
    <div>
      <div className="flex items-start justify-between gap-3"><PageTitle title="Campaigns" /><LinkButton href="/admin/campaigns/new" size="sm">New campaign</LinkButton></div>
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <input className={inputCls} placeholder="Search title or sponsor" aria-label="Search campaigns" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className={inputCls} aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select className={inputCls} aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}><option value="createdAt">Newest</option><option value="ticketsSold">Most sold</option><option value="ticketPrice">Price</option><option value="title">Title</option></select>
      </div>
      {r.isError ? <ErrorState onRetry={() => r.refetch()} /> : !r.data ? <Skeleton className="h-64 w-full" /> : (
        <>
          <Table head={['Campaign', 'Sponsor', 'Price', 'Sold', 'Status', 'Created', '']}>
            {r.data.campaigns.map((c) => (
              <tr key={c.id}>
                <Td className="font-medium">{c.title}</Td><Td>{c.sponsorName}</Td><Td>{naira(c.ticketPrice)}</Td>
                <Td className="tabular-nums">{c.ticketsSold}/{c.capacity}</Td><Td><StatusBadge status={c.status} /></Td><Td>{fmtDate(c.createdAt)}</Td>
                <Td><Link className="font-semibold text-primary-text underline" href={`/admin/campaigns/${c.id}`}>Manage</Link></Td>
              </tr>
            ))}
            {r.data.campaigns.length === 0 && <tr><Td className="text-center text-muted">No campaigns match.</Td></tr>}
          </Table>
          <Pager page={page} pageSize={r.data.pageSize} total={r.data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
