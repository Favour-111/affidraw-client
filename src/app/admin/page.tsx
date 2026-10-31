'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { naira } from '@/lib/format';
import { Card, ErrorState, PageTitle, Skeleton } from '@/components/ui';

export default function Overview() {
  const q = useQuery({ queryKey: ['admin-overview'], queryFn: () => api<{ metrics: Record<string, number> }>('/admin/overview'), refetchInterval: 20_000 });
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  const m = q.data?.metrics;
  const cards: [string, string | number | undefined, string?][] = [
    ['Total users', m?.users], ['Registered businesses', m?.businesses], ['Open campaigns', m?.openCampaigns, '/admin/campaigns'],
    ['Sold out, awaiting draw', m?.awaitingDraw, '/admin/draws'], ['Valid tickets issued', m?.validTickets], ['Gross ticket sales', m ? naira(m.grossSales) : undefined],
    ['Pending business verifications', m?.pendingVerifications, '/admin/businesses'], ['Open prize claims', m?.pendingClaims, '/admin/claims'],
  ];
  return (
    <div>
      <PageTitle title="Overview" sub="Figures are calculated from authoritative database records." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, val, href]) => {
          const body = (<Card className="h-full p-4"><p className="text-meta text-muted">{label}</p>{val === undefined ? <Skeleton className="mt-2 h-7 w-16" /> : <p className="mt-1 text-display font-bold tabular-nums">{typeof val === 'number' ? val.toLocaleString() : val}</p>}</Card>);
          return href ? <Link key={label} href={href}>{body}</Link> : <div key={label}>{body}</div>;
        })}
      </div>
    </div>
  );
}
