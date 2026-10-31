'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, PlayCircle, Ticket, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import type { Campaign } from '@/lib/types';
import { fmtDate } from '@/lib/format';
import { useMe } from '@/lib/hooks';
import { Card, EmptyState, ErrorState, LinkButton, MetaRow, Micro, Skeleton, StatusBadge, UnderlineTabs, cx } from '@/components/ui';

type Entry = { campaign: Campaign; tickets: number[]; quantity: number; won: boolean; winningTicketNumber: number | null; resultPublished: boolean; canWatchLive: boolean };
type Tab = 'active' | 'results' | 'won';

export default function MyTickets() {
  const me = useMe();
  const [tab, setTab] = useState<Tab>('active');
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'won' || t === 'results' || t === 'active') setTab(t);
  }, []);
  const user = me.data?.user;
  const q = useQuery({ queryKey: ['my-tickets', tab], queryFn: () => api<{ entries: Entry[]; counts: Record<Tab, number> }>(`/me/tickets?tab=${tab}`), enabled: !!user, placeholderData: (p) => p, refetchInterval: 20_000 });
  const counts = q.data?.counts;

  if (me.isLoading) return <Skeleton className="h-40 w-full" />;
  if (!user) return (<><h1 className="sr-only">My Tickets</h1><EmptyState icon={Ticket} title="Log in to see your tickets" text="Keep track of your entries and follow your draws." action={<LinkButton href="/login?next=/tickets">Log in</LinkButton>} /></>);

  return (
    <div className="space-y-6">
      <h1 className="sr-only">My Tickets</h1>
      <Card className="flex flex-wrap items-center justify-between gap-5 p-5">
        <div className="flex gap-10">
          <div><Micro>Active entries</Micro><p className="tabular mt-1 text-display font-bold">{counts ? counts.active : '—'}</p></div>
          <div><Micro>Results</Micro><p className="tabular mt-1 text-display font-bold">{counts ? counts.results : '—'}</p></div>
          <div><Micro>Wins</Micro><p className="tabular mt-1 text-display font-bold text-primary-text">{counts ? counts.won : '—'}</p></div>
        </div>
        <LinkButton href="/">Explore prizes</LinkButton>
      </Card>

      <UnderlineTabs<Tab> label="Ticket filters" value={tab} onChange={setTab} items={[
        { id: 'active', label: <>Active <span className="tabular font-medium text-subtle">{counts?.active ?? ''}</span></> },
        { id: 'results', label: <>Results <span className="tabular font-medium text-subtle">{counts?.results ?? ''}</span></> },
        { id: 'won', label: <>Won <span className="tabular font-medium text-subtle">{counts?.won ?? ''}</span></> },
      ]} />

      {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !q.data ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-52 w-full" />)}</div>
      ) : q.data.entries.length === 0 ? (
        tab === 'active' && q.data.counts.results === 0 && q.data.counts.won === 0
          ? <EmptyState icon={Ticket} title="You haven’t entered any draws yet." text="Pick a prize, choose your tickets, and follow the live draw here." action={<LinkButton href="/">Explore Prizes</LinkButton>} />
          : <EmptyState icon={tab === 'won' ? Trophy : Ticket} title={tab === 'won' ? 'No wins yet' : tab === 'results' ? 'No results yet' : 'No active entries'} text={tab === 'won' ? 'Keep entering — your lucky ticket could be next.' : 'Results appear here once an official draw is published.'} action={<LinkButton href="/" variant="outline">Explore Prizes</LinkButton>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {q.data.entries.map((e) => (
            <Card key={e.campaign.id} className={cx('fade-up flex flex-col p-5', e.won && 'border-primary')}>
              <div className="flex items-start gap-3.5">
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-2">{e.campaign.images[0] && <img src={e.campaign.images[0].url} alt="" className="h-full w-full object-cover" />}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/campaigns/${e.campaign.slug}`} className="line-clamp-2 text-body font-bold leading-snug text-ink hover:underline">{e.campaign.title}</Link>
                  <p className="mt-0.5 truncate text-meta text-muted">{e.campaign.sponsorName}</p>
                </div>
                <StatusBadge status={e.campaign.status} className="shrink-0" />
              </div>

              <div className="mt-4">
                <Micro>Your ticket{e.quantity > 1 ? 's' : ''}</Micro>
                <div className="mt-2 flex flex-wrap gap-2">
                  {e.tickets.map((n) => (
                    <span key={n} className={cx('tabular inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-label font-bold', e.winningTicketNumber === n ? 'bg-primary-strong text-white' : 'bg-primary-soft text-primary-text')}>
                      {e.winningTicketNumber === n && <Trophy className="h-3.5 w-3.5" aria-label="Winning ticket" />}#{n}
                    </span>
                  ))}
                </div>
              </div>

              {e.resultPublished && (
                <p className={cx('mt-4 rounded-xl px-3.5 py-2.5 text-label', e.won ? 'bg-primary-soft font-semibold text-primary-text' : 'bg-surface-2 text-muted')}>
                  {e.won ? `You won with ticket #${e.winningTicketNumber}! 🎉` : <>Winning ticket <span className="tabular font-semibold text-ink">#{e.campaign.result?.winningTicketNumber}</span></>}
                </p>
              )}

              <MetaRow className="mt-4 border-t border-line pt-3.5" items={[
                { icon: Ticket, label: `${e.quantity} ticket${e.quantity > 1 ? 's' : ''}` },
                { icon: CalendarClock, label: e.campaign.drawScheduledAt ? `Draw ${fmtDate(e.campaign.drawScheduledAt)}` : e.resultPublished ? `Result ${fmtDate(e.campaign.result?.publishedAt)}` : 'Draw after sell-out' },
              ]} />
              <div className="mt-4 flex gap-2">
                <LinkButton href={`/campaigns/${e.campaign.slug}`} variant="soft" size="sm" full>View draw</LinkButton>
                {e.canWatchLive && !e.resultPublished && <LinkButton href={`/campaigns/${e.campaign.slug}`} size="sm" full><PlayCircle className="h-4 w-4" aria-hidden />Watch live</LinkButton>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
