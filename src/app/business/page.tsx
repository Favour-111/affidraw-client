'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Clock, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDate, naira } from '@/lib/format';
import { BUSINESS_EMAIL, businessMailto } from '@/lib/contact';
import { Alert, Card, EmptyState, ErrorState, LinkButton, PageTitle, ProgressBar, Skeleton, StatusBadge, Timeline } from '@/components/ui';

type Biz = {
  businessName: string; registrationNumber: string | null; contactEmail: string; contactPhone: string | null; representative: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'UNVERIFIED'; rejectionReason: string | null; reviewedAt: string | null;
  submittedAt: string; reviewDueAt: string; detailsSubmitted: boolean;
};

export default function Page() {
  return <Suspense><BusinessHome /></Suspense>;
}

function BusinessHome() {
  // While under review, keep checking so the portal opens by itself once an admin approves.
  const biz = useQuery({
    queryKey: ['biz'], queryFn: () => api<{ business: Biz | null; reviewHours: number }>('/business/me'),
    refetchInterval: (q) => (q.state.data?.business && q.state.data.business.verificationStatus !== 'VERIFIED' ? 30_000 : false),
  });
  if (biz.isError) return <ErrorState onRetry={() => biz.refetch()} />;
  if (!biz.data) return <Skeleton className="h-48 w-full" />;
  const b = biz.data.business;
  if (!b) return (<><PageTitle title="Business portal" /><EmptyState title="Register your business" text="Tell us about your business so we can verify you before your first campaign goes live." action={<LinkButton href="/business/onboard">Start registration</LinkButton>} /></>);
  if (b.verificationStatus === 'REJECTED') return <Declined b={b} />;
  if (b.verificationStatus !== 'VERIFIED') return <UnderReview b={b} hours={biz.data.reviewHours} />;
  return <Dashboard b={b} />;
}

function ContactLine({ subject }: { subject: string }) {
  return (
    <a href={businessMailto(subject)} className="inline-flex items-center gap-2 text-label font-semibold text-primary-text hover:underline">
      <Mail className="h-4 w-4" aria-hidden />{BUSINESS_EMAIL}
    </a>
  );
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

function ReviewClock({ start, due }: { start: string; due: string }) {
  const now = useNow();
  const end = new Date(due).getTime();
  const total = end - new Date(start).getTime();
  const left = Math.max(0, end - now);
  const s = Math.floor(left / 1000);
  const parts: [string, number][] = [['hours', Math.floor(s / 3600)], ['minutes', Math.floor((s % 3600) / 60)], ['seconds', s % 60]];
  return (
    <div>
      <div className="flex items-start justify-center gap-2 sm:gap-3" role="timer" aria-label={`${parts[0][1]} hours ${parts[1][1]} minutes remaining`}>
        {parts.map(([label, n], i) => (
          <div key={label} className="flex items-start gap-2 sm:gap-3">
            {i > 0 && <span aria-hidden className="pt-3 text-title font-bold text-muted">:</span>}
            <div className="text-center">
              <span className="block min-w-[4.25rem] rounded-xl bg-surface-2 px-3 py-3 text-display font-bold tabular-nums text-ink sm:min-w-[5rem]">{String(n).padStart(2, '0')}</span>
              <span className="mt-1.5 block text-micro font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-5 h-1.5 max-w-sm overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full rounded-full bg-primary transition-[width] duration-1000" style={{ width: `${Math.min(100, ((total - left) / total) * 100)}%` }} />
      </div>
      {left === 0 && <p className="mt-4 text-center text-label text-muted">This is taking a little longer than usual. Thanks for your patience — feel free to email us.</p>}
    </div>
  );
}

function UnderReview({ b, hours }: { b: Biz; hours: number }) {
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Card className="p-6 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary"><Clock className="h-6 w-6" aria-hidden /></span>
        <h1 className="mt-4 text-title font-bold">Your account is under review</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-body text-muted">Our team checks every business before it can run campaigns. Give us {hours} hours — we’ll notify you as soon as you’re approved.</p>
        <div className="mt-7"><ReviewClock start={b.submittedAt} due={b.reviewDueAt} /></div>
      </Card>

      {!b.detailsSubmitted && (
        <Alert tone="warning" title="Add your business details">
          We need a few details about your business to complete the review. <a href="/business/onboard" className="font-semibold underline">Add details now</a>
        </Alert>
      )}

      <Card className="p-5">
        <Timeline steps={[
          { title: 'Account created', detail: fmtDate(b.submittedAt), state: 'done' },
          { title: 'Business details', detail: b.detailsSubmitted ? 'Submitted' : 'Needed to complete the review', state: b.detailsSubmitted ? 'done' : 'current' },
          { title: 'Review by our team', detail: `Usually within ${hours} hours`, state: b.detailsSubmitted ? 'current' : 'upcoming' },
          { title: 'Business account opens', detail: 'Request campaigns and track their sales', state: 'upcoming' },
        ]} />
      </Card>

      {b.detailsSubmitted && <BusinessDetails b={b} action={<a href="/business/onboard" className="text-meta font-semibold text-primary-text hover:underline">Edit</a>} />}

      <Card className="space-y-2 p-5">
        <p className="text-label font-semibold">Questions about your review?</p>
        <ContactLine subject={`Business review: ${b.businessName}`} />
      </Card>
    </div>
  );
}

function Declined({ b }: { b: Biz }) {
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageTitle title="We couldn’t approve your business yet" sub="Update your details and resubmit, and we’ll review it again." />
      <Alert tone="error" title="Reason from our team">{b.rejectionReason ?? 'Please contact us for details.'}</Alert>
      <LinkButton href="/business/onboard" size="lg">Update details and resubmit</LinkButton>
      <Card className="space-y-2 p-5">
        <p className="text-label font-semibold">Want to talk it through?</p>
        <ContactLine subject={`Business application: ${b.businessName}`} />
      </Card>
    </div>
  );
}

function BusinessDetails({ b, action }: { b: Biz; action?: React.ReactNode }) {
  const rows: [string, string | null][] = [
    ['Business name', b.businessName], ['CAC registration number', b.registrationNumber], ['Authorised representative', b.representative],
    ['Contact email', b.contactEmail], ['Contact phone', b.contactPhone],
  ];
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-2"><p className="text-label font-semibold">About your business</p>{action}</div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map(([k, v]) => <div key={k}><dt className="text-meta text-muted">{k}</dt><dd className="break-words text-label text-ink">{v || '—'}</dd></div>)}
      </dl>
    </Card>
  );
}

function Dashboard({ b }: { b: Biz }) {
  const submitted = useSearchParams().get('submitted') === '1';
  const camps = useQuery({ queryKey: ['biz-campaigns'], queryFn: () => api<{ campaigns: any[] }>('/business/campaigns') });
  const list = camps.data?.campaigns ?? [];
  const count = (f: (c: any) => boolean) => list.filter(f).length;
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-display font-bold">{b.businessName}</h1>
          <p className="mt-1 inline-flex items-center gap-1.5 text-label font-semibold text-primary-text"><BadgeCheck className="h-4 w-4" aria-hidden />Verified business{b.reviewedAt ? ` since ${new Date(b.reviewedAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}` : ''}</p>
        </div>
        <LinkButton href="/business/campaigns/new" size="sm">Request a campaign</LinkButton>
      </div>
      {submitted && <Alert tone="success" title="Campaign request sent">Our team will review it and contact you before anything is published.</Alert>}

      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <BusinessDetails b={b} />
        <Card className="space-y-3 p-5">
          <p className="text-label font-semibold">How campaigns go live</p>
          <ol className="list-decimal space-y-1.5 pl-5 text-label text-muted">
            <li>You request a campaign with your prize details.</li>
            <li>Our team reviews it and may ask for changes.</li>
            <li>Once approved, we publish it to the marketplace.</li>
          </ol>
          <p className="text-meta text-muted">Campaigns can only be published by our team. To discuss one, email us:</p>
          <ContactLine subject={`Campaign enquiry: ${b.businessName}`} />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Requested', list.length], ['Pending review', count((c) => c.status === 'PENDING_APPROVAL')], ['Active', count((c) => ['OPEN', 'PAUSED', 'SOLD_OUT', 'AWAITING_DRAW', 'DRAW_IN_PROGRESS', 'RESULT_PENDING'].includes(c.status))], ['Completed', count((c) => c.status === 'COMPLETED')]].map(([l, n]) => <Card key={l as string} className="p-4"><p className="text-meta text-muted">{l}</p><p className="mt-1 text-display font-bold tabular-nums">{n}</p></Card>)}
      </div>
      {camps.isError ? <ErrorState onRetry={() => camps.refetch()} /> : camps.isLoading ? <Skeleton className="h-40 w-full" /> : list.length === 0 ? <EmptyState title="No campaigns yet" text="Request your first prize campaign — our team will review it with you." action={<LinkButton href="/business/campaigns/new" size="sm">Request a campaign</LinkButton>} /> : (
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
