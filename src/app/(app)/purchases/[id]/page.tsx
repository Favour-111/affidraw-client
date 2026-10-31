'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Printer, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDate, naira } from '@/lib/format';
import { Button, Card, ErrorState, LinkButton, Micro, Skeleton } from '@/components/ui';

type P = { id: string; quantity: number; totalAmount: number; status: string; allocationStatus: string; createdAt: string; tickets: number[]; campaign?: { slug: string; title: string; image: string | null }; payment: { status: string; reference: string; authorizationUrl: string | null } | null };

export default function PurchasePage() {
  const { id } = useParams<{ id: string }>();
  // Poll with a provider re-check while pending. The server, never this page, decides when tickets exist.
  const q = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => api<{ purchase: P }>(`/purchases/${id}?refresh=1`),
    refetchInterval: (query) => (query.state.data?.purchase.status === 'PENDING' ? 3000 : false),
  });
  if (q.isError) return <div className="mx-auto max-w-md"><ErrorState onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <Skeleton className="mx-auto h-80 max-w-md" />;
  const p = q.data.purchase;
  const done = p.status === 'PAID' && p.allocationStatus === 'ALLOCATED';
  const pending = p.status === 'PENDING' || (p.status === 'PAID' && p.allocationStatus === 'PENDING');
  const refund = p.status === 'REFUND_REQUIRED' || p.status === 'REFUNDED';

  const head = done
    ? { Icon: CheckCircle2, cls: 'text-primary', title: 'Your tickets are confirmed!', text: p.campaign?.title }
    : pending
      ? { Icon: Clock, cls: 'text-warning', title: 'Confirming your payment…', text: 'We’re confirming your payment. Your tickets will appear once payment is verified.' }
      : refund
        ? { Icon: XCircle, cls: 'text-danger', title: 'We couldn’t issue your tickets', text: `The draw filled up before your payment was confirmed. ${p.status === 'REFUNDED' ? 'Your payment has been refunded in full.' : 'Your refund is being processed automatically.'}` }
        : { Icon: XCircle, cls: 'text-danger', title: 'Payment not completed', text: 'Your payment could not be completed. You can try again.' };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card className="p-6 text-center">
        <head.Icon className={`pop mx-auto h-12 w-12 ${head.cls}`} strokeWidth={1.75} aria-hidden />
        <h1 className="mt-4 text-display font-bold">{head.title}</h1>
        {head.text && <p className="mt-1.5 text-body text-muted">{head.text}</p>}
        {done && (
          <div className="mt-6">
            <Micro>Your ticket numbers</Micro>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {p.tickets.map((n) => <span key={n} className="pop tabular rounded-xl bg-primary-soft px-4 py-2 text-display font-extrabold text-primary-text">#{n}</span>)}
            </div>
          </div>
        )}
        {pending && p.payment?.authorizationUrl && <Button className="mt-5" variant="outline" onClick={() => (window.location.href = p.payment!.authorizationUrl!)}>Return to payment</Button>}

        <dl className="mt-7 space-y-2.5 border-t border-dashed border-line-strong pt-5 text-left text-label">
          <div className="flex justify-between gap-4"><dt className="text-muted">Receipt</dt><dd className="truncate font-mono text-meta text-ink">{p.payment?.reference}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Quantity</dt><dd className="tabular font-semibold text-ink">{p.quantity}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Total</dt><dd className="tabular font-bold text-ink">{naira(p.totalAmount)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Date</dt><dd className="text-ink">{fmtDate(p.createdAt)}</dd></div>
        </dl>
      </Card>
      <div className="no-print grid grid-cols-2 gap-3">
        <LinkButton href="/tickets" full>View My Tickets</LinkButton>
        <LinkButton href={p.campaign ? `/campaigns/${p.campaign.slug}` : '/'} variant="outline" full>View draw</LinkButton>
      </div>
      {done && <Button className="no-print" variant="ghost" full onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden />Print or save receipt</Button>}
    </div>
  );
}
