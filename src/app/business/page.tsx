'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { naira } from '@/lib/format';
import { Alert, Card, EmptyState, ErrorState, LinkButton, PageTitle, ProgressBar, Skeleton, StatusBadge } from '@/components/ui';

export default function BusinessHome() {
  const biz = useQuery({ queryKey: ['biz'], queryFn: () => api<{ business: any | null }>('/business/me') });
  const camps = useQuery({ queryKey: ['biz-campaigns'], queryFn: () => api<{ campaigns: any[] }>('/business/campaigns'), enabled: !!biz.data?.business });
  if (biz.isError) return <ErrorState onRetry={() => biz.refetch()} />;
  if (!biz.data) return <Skeleton className="h-48 w-full" />;
  const b = biz.data.business;
  if (!b) return (<><PageTitle title="Business portal" /><EmptyState title="Register your business" text="Tell us about your business so we can verify you before your first campaign goes live." action={<LinkButton href="/business/onboard">Start registration</LinkButton>} /></>);
  const list = camps.data?.campaigns ?? [];
  const count = (f: (c: any) => boolean) => list.filter(f).length;
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3"><PageTitle title={b.businessName} sub={`Verification: ${b.verificationStatus.toLowerCase()}`} /><LinkButton href="/business/campaigns/new" size="sm">Submit campaign</LinkButton></div>
      {b.verificationStatus !== 'VERIFIED' && <Alert tone={b.verificationStatus === 'REJECTED' ? 'error' : 'warning'}>{b.verificationStatus === 'REJECTED' ? `Verification declined: ${b.rejectionReason ?? 'contact support'}.` : 'Your business is awaiting verification. You can submit campaigns, but they can’t be published until you’re verified.'}</Alert>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Submitted', list.length], ['Pending review', count((c) => c.status === 'PENDING_APPROVAL')], ['Active', count((c) => ['OPEN', 'PAUSED', 'SOLD_OUT', 'AWAITING_DRAW', 'DRAW_IN_PROGRESS', 'RESULT_PENDING'].includes(c.status))], ['Completed', count((c) => c.status === 'COMPLETED')]].map(([l, n]) => <Card key={l as string} className="p-4"><p className="text-meta text-muted">{l}</p><p className="mt-1 text-display font-bold tabular-nums">{n}</p></Card>)}
      </div>
      {camps.isLoading ? <Skeleton className="h-40 w-full" /> : list.length === 0 ? <EmptyState title="No campaigns yet" text="Submit your first prize for review." /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((c) => (
            <Card key={c.id} className="space-y-3 p-4">
              <div className="flex gap-3"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">{c.image && <img src={c.image} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0"><p className="truncate font-semibold">{c.title}</p><StatusBadge status={c.status} /></div></div>
              <ProgressBar sold={c.ticketsSold} capacity={c.capacity} />
              <p className="text-label text-muted">Gross sales: <strong className="text-fg">{naira(c.grossSales)}</strong></p>
              {c.rejectionReason && ['CHANGES_REQUESTED', 'REJECTED'].includes(c.status) && <Alert tone="warning">Reviewer note: {c.rejectionReason}</Alert>}
              {c.drawCompleted && <p className="text-label">Winning ticket #{c.winningTicketNumber} · Fulfilment: <strong>{c.fulfilment?.status.replace(/_/g, ' ').toLowerCase() ?? 'pending'}</strong>{c.fulfilment?.deliveryStatus ? ` — ${c.fulfilment.deliveryStatus}` : ''}</p>}
            </Card>
          ))}
        </div>
      )}
      <p className="text-meta text-muted">For privacy, sponsors see aggregate sales only — never the personal details of ticket buyers.</p>
    </div>
  );
}
