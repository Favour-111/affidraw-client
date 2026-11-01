'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BadgeCheck, CalendarClock, ChevronRight, CreditCard, Minus, Plus, Share2, ShieldCheck, Ticket, Trophy, Users, Wallet, PlayCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Campaign } from '@/lib/types';
import { fmtDate, naira, pct, youtubeEmbed } from '@/lib/format';
import { newIdempotencyKey, useMe, useWallet } from '@/lib/hooks';
import TicketReveal from '@/components/TicketReveal';
import { Alert, Button, Card, Disclosure, ErrorState, LinkButton, MetaRow, Micro, ProgressBar, Skeleton, StatusBadge, Timeline, cx } from '@/components/ui';

type Draw = { status: string; algorithm: string; poolCommitment: string | null; seedCommitment: string | null; poolSize: number | null; result: { winningTicketNumber: number; publishedAt: string } | null; verification: { serverSeed: string } | null } | null;

const STAGE: Record<string, number> = { SCHEDULED: 0, OPEN: 1, PAUSED: 1, SOLD_OUT: 2, AWAITING_DRAW: 2, DRAW_IN_PROGRESS: 2, RESULT_PENDING: 3, COMPLETED: 4 };

const CLOSED_COPY: Record<string, string> = {
  SCHEDULED: 'This draw opens soon.',
  PAUSED: 'Entries are temporarily paused.',
  SOLD_OUT: 'All tickets have been sold. Follow the campaign for draw updates.',
  AWAITING_DRAW: 'Tickets have sold out. The official draw is being prepared.',
  DRAW_IN_PROGRESS: 'The official draw is happening now.',
  RESULT_PENDING: 'The draw has been held. The official result is being verified.',
  COMPLETED: 'The official winning number has been announced.',
  CANCELLED: 'This campaign was cancelled. Tickets are refunded under the refund rules below.',
};

export default function CampaignPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const me = useMe();
  const user = me.data?.user;
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const [buying, setBuying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paying, setPaying] = useState(false);
  const [reveal, setReveal] = useState<{ numbers: number[]; total: number; balance: number } | null>(null);
  const qc = useQueryClient();
  const wallet = useWallet(!!user);
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get('qty'));
    if (Number.isInteger(n) && n > 0 && n <= 100) setQty(n);
  }, []);

  const q = useQuery({ queryKey: ['campaign', slug], queryFn: () => api<{ campaign: Campaign }>(`/campaigns/${slug}`), refetchInterval: 15_000 });
  const c = q.data?.campaign;
  const av = useQuery({ queryKey: ['availability', slug, user?.id], queryFn: () => api<{ purchasable: number; userRemaining: number | null; remaining: number }>(`/campaigns/${slug}/ticket-availability`), enabled: !!c, refetchInterval: 15_000 });
  const drawQ = useQuery({ queryKey: ['draw', slug], queryFn: () => api<{ draw: Draw }>(`/campaigns/${slug}/draw`), enabled: !!c && c.status !== 'OPEN' && c.status !== 'SCHEDULED' });
  const mine = useQuery({ queryKey: ['my-campaign-tickets', slug], queryFn: () => api<{ tickets: { ticketNumber: number }[] }>(`/me/campaigns/${slug}/tickets`), enabled: !!user && !!c });
  const related = useQuery({ queryKey: ['related', c?.category.slug], queryFn: () => api<{ campaigns: Campaign[] }>(`/campaigns?category=${c!.category.slug}&pageSize=5`), enabled: !!c });

  if (q.isError) return <div className="mx-auto max-w-2xl"><ErrorState message={(q.error as ApiError).status === 404 ? 'This campaign could not be found.' : undefined} onRetry={() => q.refetch()} /></div>;
  if (!c) return <div className="mx-auto max-w-2xl space-y-4"><Skeleton className="h-10 w-10" /><Skeleton className="aspect-[16/10] w-full" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-48 w-full" /></div>;

  const open = c.status === 'OPEN';
  const media = [...c.images.map((m) => ({ ...m, type: 'image' as const })), ...(c.videos ?? []).map((m) => ({ ...m, alt: null, type: 'video' as const }))];
  const maxQty = Math.max(0, Math.min(av.data?.purchasable ?? c.ticketsRemaining, av.data?.userRemaining ?? c.maxTicketsPerUser, c.maxTicketsPerUser));
  const clamped = Math.min(Math.max(qty, 1), Math.max(maxQty, 1));
  const total = c.ticketPrice * clamped;
  const embed = youtubeEmbed(c.youtubeUrl);
  const draw = drawQ.data?.draw;
  const myNums = mine.data?.tickets.map((t) => t.ticketNumber) ?? [];
  const iWon = !!c.result && myNums.includes(c.result.winningTicketNumber);
  const stage = STAGE[c.status] ?? 0;
  const st = (i: number) => (stage > i ? 'done' : stage === i ? 'current' : 'upcoming') as 'done' | 'current' | 'upcoming';
  const others = (related.data?.campaigns ?? []).filter((x) => x.id !== c.id).slice(0, 4);

  async function buyWithCard() {
    if (!user) return router.push(`/login?next=${encodeURIComponent(`/campaigns/${slug}`)}`);
    setBuying(true); setErr(null);
    try {
      await api('/purchases/quote', { body: { campaignId: c!.id, quantity: clamped } });
      // One idempotency key per click-through, so a double tap or retry cannot create two purchases.
      const key = newIdempotencyKey();
      const r = await api<{ purchase: { id: string; payment: { authorizationUrl: string | null } | null } }>('/purchases', { body: { campaignId: c!.id, quantity: clamped }, headers: { 'Idempotency-Key': key } });
      const url = r.purchase.payment?.authorizationUrl;
      if (url) window.location.href = url; else router.push(`/purchases/${r.purchase.id}`);
    } catch (e) {
      setErr((e as ApiError).message);
      setBuying(false);
    }
  }

  async function buyWithWallet() {
    if (!user) return router.push(`/login?next=${encodeURIComponent(`/campaigns/${slug}`)}`);
    setPaying(true); setErr(null);
    try {
      const r = await api<{ tickets: number[]; balance: number; purchase: { totalAmount: number } }>('/purchases/wallet', {
        body: { campaignId: c!.id, quantity: clamped }, headers: { 'Idempotency-Key': newIdempotencyKey() },
      });
      setReveal({ numbers: r.tickets, total: r.purchase.totalAmount, balance: r.balance });
      setQty(1);
      ['campaign', 'availability', 'wallet', 'my-campaign-tickets', 'my-tickets', 'me', 'campaigns'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    } catch (e) {
      const ae = e as ApiError;
      setErr(ae.message);
      if (ae.code === 'INSUFFICIENT_FUNDS') qc.invalidateQueries({ queryKey: ['wallet'] });
    } finally {
      setPaying(false);
    }
  }

  async function share() {
    const data = { title: c!.title, text: `Enter the draw for ${c!.title} on Raffler`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* cancelled */ }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => (history.length > 1 ? router.back() : router.push('/'))} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface-2 text-ink hover:bg-surface-3"><ArrowLeft className="h-5 w-5" /></button>
        <button onClick={share} aria-label="Share this draw" className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink hover:bg-surface-3">
          <Share2 className="h-4.5 w-4.5" />
          {copied && <span role="status" className="fade-up absolute right-0 top-11 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-meta font-semibold text-surface">Link copied</span>}
        </button>
      </div>

      <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-surface-2">
        {media[img]?.type === 'video'
          ? <video key={media[img].url} src={media[img].url} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" aria-label={`${c.title} video`} />
          : media[img] && <img src={media[img].url} alt={media[img].alt ?? c.title} className="h-full w-full object-cover" />}
      </div>
      {media.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {media.map((m, i) => (
            <button key={i} onClick={() => setImg(i)} aria-label={m.type === 'video' ? `Play video ${i + 1}` : `Show photo ${i + 1}`} aria-current={i === img} className={cx('relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-black', i === img ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100')}>
              {m.type === 'video' ? <><video src={m.url} muted playsInline preload="metadata" className="h-full w-full object-cover" /><PlayCircle className="absolute inset-0 m-auto h-6 w-6 text-white" aria-hidden /></> : <img src={m.url} alt="" className="h-full w-full object-cover" />}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <span className="rounded-md bg-surface-2 px-2 py-0.5 text-meta font-semibold text-muted">{c.category.name}</span>
        </div>
        <h1 className="mt-3 text-title font-bold">{c.title}</h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-label text-muted">
          Sponsored by <span className="font-semibold text-ink">{c.sponsorName}</span>
          {c.sponsorVerified && <span className="inline-flex items-center gap-0.5 font-semibold text-primary-text"><BadgeCheck className="h-4 w-4" aria-hidden />Verified</span>}
        </p>
        <p className="mt-4 whitespace-pre-line text-body text-fg">{c.description}</p>
      </div>

      <MetaRow className="mt-6 border-y border-line py-3.5" spread items={[
        { icon: Ticket, label: <><span className="tabular font-semibold text-ink">{naira(c.ticketPrice)}</span>&nbsp;per ticket</> },
        { icon: Users, label: <>Max&nbsp;<span className="font-semibold text-ink">{c.maxTicketsPerUser}</span>&nbsp;each</> },
        ...(c.prizeValue ? [{ icon: Trophy, label: <>Worth&nbsp;<span className="tabular font-semibold text-ink">{naira(c.prizeValue)}</span></> }] : []),
        { icon: CalendarClock, label: c.drawScheduledAt ? fmtDate(c.drawScheduledAt) : 'Draw after sell-out' },
      ]} />

      {c.result && (
        <Card className="pop mt-6 border-primary-soft-border bg-primary-soft p-6 text-center">
          <Trophy className="mx-auto h-8 w-8 text-primary" aria-hidden />
          <Micro className="mt-3 block text-primary-text">We have a winner</Micro>
          <p className="tabular mt-1 text-[2.125rem] font-extrabold leading-none text-ink">#{c.result.winningTicketNumber}</p>
          <p className="mt-3 text-label text-muted">Official result published {fmtDate(c.result.publishedAt)}</p>
          {iWon && <p className="mt-4 rounded-xl bg-primary-strong px-4 py-3 text-label font-semibold text-white">That’s your ticket — congratulations! Check your notifications for how to claim your prize.</p>}
        </Card>
      )}

      <Card className="mt-6 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-heading font-bold">Tickets</p>
            <p className="tabular mt-0.5 text-meta text-muted">{c.ticketsRemaining.toLocaleString()} of {c.capacity.toLocaleString()} remaining</p>
          </div>
          <div className="text-right">
            <p className="tabular text-display font-bold text-primary-text">{pct(c.ticketsSold, c.capacity)}%</p>
            <Micro>sold</Micro>
          </div>
        </div>
        <div className="mt-4"><ProgressBar sold={c.ticketsSold} capacity={c.capacity} label={false} /></div>

        {open ? (
          maxQty === 0 && user ? (
            <div className="mt-5"><Alert>You’ve reached the ticket limit for this draw.</Alert></div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-line p-1.5 pl-4">
                <span className="text-label font-semibold text-ink" id="qty-label">Quantity</span>
                <div className="flex items-center gap-1" role="group" aria-labelledby="qty-label">
                  <button onClick={() => setQty(clamped - 1)} disabled={clamped <= 1} aria-label="Fewer tickets" className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-ink hover:bg-surface-3 disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                  <output aria-live="polite" className="tabular w-12 text-center text-heading font-bold text-ink">{clamped}</output>
                  <button onClick={() => setQty(clamped + 1)} disabled={clamped >= maxQty} aria-label="More tickets" className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-ink hover:bg-surface-3 disabled:opacity-40"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="flex items-baseline justify-between px-1">
                <span className="tabular text-label text-muted">{clamped} × {naira(c.ticketPrice)}</span>
                <span className="tabular text-heading font-bold text-ink">{naira(total)}</span>
              </div>
              {err && <Alert tone="error">{err}</Alert>}
              {!user ? (
                <Button full size="lg" onClick={buyWithWallet}>Log in to enter</Button>
              ) : !wallet.data ? (
                <div className="skeleton h-12 w-full" />
              ) : wallet.data.balance >= total ? (
                <>
                  <Button full size="lg" onClick={buyWithWallet} loading={paying} disabled={maxQty === 0}><Wallet className="h-4.5 w-4.5" aria-hidden />Pay {naira(total)} from wallet</Button>
                  <p className="tabular text-center text-meta text-muted">Wallet balance {naira(wallet.data.balance)} → {naira(wallet.data.balance - total)} after this entry</p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-xl bg-warning-soft px-4 py-3 text-label text-warning">
                    <span>Wallet balance <strong className="tabular">{naira(wallet.data.balance)}</strong></span>
                    <span className="tabular font-semibold">Need {naira(total - wallet.data.balance)} more</span>
                  </div>
                  <LinkButton href={`/wallet/deposit?amount=${Math.max(200, Math.ceil((total - wallet.data.balance) / 100))}&returnTo=${encodeURIComponent(`/campaigns/${slug}`)}`} full size="lg"><Plus className="h-4.5 w-4.5" aria-hidden />Add money to wallet</LinkButton>
                </>
              )}
              {user && <Button variant="ghost" size="sm" full onClick={buyWithCard} loading={buying}><CreditCard className="h-4 w-4" aria-hidden />Pay with card instead</Button>}
              <p className="flex items-center justify-center gap-1.5 text-meta text-muted"><ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />Your numbers are assigned by our server the moment you pay.</p>
            </div>
          )
        ) : (
          <div className="mt-5"><Alert tone={c.status === 'CANCELLED' ? 'error' : 'info'}>{CLOSED_COPY[c.status] ?? 'Entries are closed.'}</Alert></div>
        )}
      </Card>

      {myNums.length > 0 && (
        <Card className="mt-4 p-5">
          <p className="text-label font-bold text-ink">Your tickets</p>
          <div className="mt-3 flex flex-wrap gap-2">{myNums.map((n) => <span key={n} className={cx('tabular rounded-lg px-3 py-1.5 text-label font-bold', c.result?.winningTicketNumber === n ? 'bg-primary-strong text-white' : 'bg-primary-soft text-primary-text')}>#{n}</span>)}</div>
        </Card>
      )}

      {(embed || c.drawScheduledAt) && !open && (
        <section className="mt-8">
          <h2 className="text-heading font-bold">Official draw</h2>
          <p className="mt-1 text-label text-muted">{c.drawScheduledAt ? `Scheduled for ${fmtDate(c.drawScheduledAt)}.` : 'The broadcast link will be shared before the draw.'}</p>
          {embed && (
            <div className="mt-4 aspect-video overflow-hidden rounded-2xl bg-black">
              <iframe src={embed} title={`${c.title} draw broadcast`} className="h-full w-full" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            </div>
          )}
          <p className="mt-3 text-meta text-muted">The winning number on this page comes from the verified official result, not from the video.</p>
        </section>
      )}

      <section className="mt-8 space-y-3" aria-labelledby="rules">
        <h2 id="rules" className="text-heading font-bold">Rules &amp; timeline</h2>
        <p className="text-body text-muted">{c.rules.draw}</p>
        <Disclosure title="Timeline & draw" defaultOpen>
          {c.status === 'CANCELLED' ? <p>This campaign was cancelled; no draw will take place.</p> : (
            <Timeline steps={[
              { title: 'Entries open', detail: c.publishedAt ? fmtDate(c.publishedAt) : c.startsAt ? `Opens ${fmtDate(c.startsAt)}` : undefined, state: st(0) },
              { title: 'All tickets sold', detail: `${c.ticketsSold.toLocaleString()} of ${c.capacity.toLocaleString()} sold`, state: st(1) },
              { title: 'Official live draw', detail: c.drawScheduledAt ? fmtDate(c.drawScheduledAt) : 'Scheduled after sell-out', state: st(2) },
              { title: 'Result published', detail: c.result ? fmtDate(c.result.publishedAt) : 'With the evidence to verify it', state: st(3) },
            ]} />
          )}
        </Disclosure>
        <Disclosure title="Who can enter"><p>{c.rules.eligibility}</p></Disclosure>
        <Disclosure title="Refunds & cancellation"><p>{c.rules.refunds}</p></Disclosure>
        <Disclosure title="Winner verification & prize delivery"><p>{c.rules.delivery}</p></Disclosure>
        {draw && draw.poolCommitment && (
          <Disclosure title="Verify this draw">
            <div className="space-y-2 break-all text-meta">
              <p>Procedure <code className="text-ink">{draw.algorithm}</code>. The {draw.poolSize}-ticket pool and a secret seed were committed before selection.</p>
              <p>Pool commitment: <code className="text-ink">{draw.poolCommitment}</code></p>
              <p>Seed commitment: <code className="text-ink">{draw.seedCommitment}</code></p>
              {draw.verification ? <p>Revealed seed: <code className="text-ink">{draw.verification.serverSeed}</code></p> : <p>The seed is revealed when the result is published, so anyone can recompute the winner.</p>}
            </div>
          </Disclosure>
        )}
        <p className="pt-1 text-meta text-muted">By entering you agree to the <Link className="font-semibold text-ink underline underline-offset-2" href="/legal/terms">Terms</Link> and <Link className="font-semibold text-ink underline underline-offset-2" href="/legal/responsible">Responsible participation</Link> guidance.</p>
      </section>

      {others.length > 0 && (
        <section className="mt-10" aria-labelledby="related">
          <h2 id="related" className="text-heading font-bold">More in {c.category.name}</h2>
          <ul className="mt-3 divide-y divide-line">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={`/campaigns/${o.slug}`} className="group flex items-center gap-4 py-3.5">
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">{o.images[0] && <img src={o.images[0].url} alt="" className="h-full w-full object-cover" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold text-ink group-hover:underline">{o.title}</span>
                    <span className="mt-1 inline-flex rounded-md bg-primary-soft px-2 py-0.5 text-meta font-semibold text-primary-text">{o.status === 'COMPLETED' ? 'Completed' : `${pct(o.ticketsSold, o.capacity)}% sold · ${naira(o.ticketPrice)}`}</span>
                  </span>
                  <ChevronRight className="h-4.5 w-4.5 shrink-0 text-subtle" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {reveal && <TicketReveal numbers={reveal.numbers} capacity={c.capacity} campaignTitle={c.title} total={reveal.total} balance={reveal.balance} onClose={() => setReveal(null)} />}
    </div>
  );
}
