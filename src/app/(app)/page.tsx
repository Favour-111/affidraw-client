'use client';
import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, Search, SearchX, Store, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Campaign } from '@/lib/types';
import { useMe, useWallet } from '@/lib/hooks';
import CampaignCard, { CampaignCardSkeleton } from '@/components/CampaignCard';
import FeaturedCarousel from '@/components/FeaturedCarousel';
import { EmptyState, ErrorState, LinkButton, UnderlineTabs, cx } from '@/components/ui';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'almost', label: 'Almost sold out' },
  { id: 'awaiting', label: 'Awaiting draw' },
  { id: 'won', label: 'Won' },
];

/** First-run guidance, modelled on the reference's "Get started" card. */
function GetStarted() {
  const me = useMe();
  const user = me.data?.user;
  const t = useQuery({ queryKey: ['my-tickets', 'active'], queryFn: () => api<{ counts: Record<string, number> }>('/me/tickets?tab=active'), enabled: !!user });
  const w = useWallet(!!user);
  if (me.isLoading || (user && (!t.data || !w.data))) return null;
  const entered = !!t.data && Object.values(t.data.counts).some((n) => n > 0);
  if (entered) return null;
  const deposited = !!w.data && Number(w.data.totalDeposited) > 0;
  const steps = [
    { title: 'Create your account', done: !!user, action: !user && <LinkButton href="/register" size="sm">Sign up</LinkButton> },
    { title: 'Make your first deposit', done: deposited, action: user && !deposited && <LinkButton href="/wallet/deposit" size="sm">Deposit</LinkButton> },
    { title: 'Enter your first draw', done: false, action: user && deposited && <span className="text-meta font-semibold text-primary-text">Pick a prize below</span> },
  ];
  const step = steps.findIndex((s) => !s.done) + 1;
  return (
    <section aria-label="Get started" className="overflow-hidden rounded-2xl border border-primary-soft-border bg-surface">
      <div className="flex items-center justify-between bg-primary-strong px-4 py-2.5 text-meta font-semibold text-white">
        <span>Get started</span><span className="tabular text-white/85">Step {step} of {steps.length}</span>
      </div>
      <ol className="divide-y divide-line">
        {steps.map((s) => (
          <li key={s.title} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <span className="flex items-center gap-3">
              {s.done ? <CheckCircle2 className="h-5 w-5 text-primary" aria-label="Done" /> : <Circle className="h-5 w-5 text-line-strong" aria-label="To do" />}
              <span className={cx('text-label font-semibold', s.done ? 'text-muted line-through' : 'text-ink')}>{s.title}</span>
            </span>
            {s.action}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Market() {
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q.trim());
  const [category, setCategory] = useState('all');
  const [filter, setFilter] = useState('all');

  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api<{ categories: { id: string; name: string; slug: string }[] }>('/categories'), staleTime: 300_000 });
  const list = useQuery({
    queryKey: ['campaigns', dq, category, filter],
    queryFn: () => api<{ campaigns: Campaign[]; featured: Campaign | null; featuredList?: Campaign[]; total: number }>(`/campaigns?${new URLSearchParams({ q: dq, category, filter, pageSize: '24' })}`),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  });
  const filtered = !!dq || category !== 'all' || filter !== 'all';
  const featuredList = filtered ? [] : (list.data?.featuredList ?? (list.data?.featured ? [list.data.featured] : []));
  const featuredIds = new Set(featuredList.map((c) => c.id));
  const campaigns = (list.data?.campaigns ?? []).filter((c) => !featuredIds.has(c.id));

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Market</h1>
      <p className="-mt-2 text-body text-muted"><span className="font-semibold text-ink">Your next big win starts here.</span> Discover amazing prizes and explore available draws.</p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted" aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prizes, sponsors or categories" aria-label="Search draws"
          className="h-11 w-full rounded-xl border border-line bg-surface pl-11 pr-11 text-body sm:h-12 text-ink outline-none transition-colors focus:border-primary focus:ring-3 focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden" />
        {q && <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-2"><X className="h-4 w-4" /></button>}
      </div>

      <GetStarted />

      {/* <div className="space-y-4">
        <UnderlineTabs label="Categories" value={category} onChange={setCategory}
          items={[{ id: 'all', label: 'All' }, ...(cats.data?.categories ?? []).map((c) => ({ id: c.slug, label: c.name }))]} />
      </div> */}

      {/* Phones: compact card per slide. Tablet/desktop: large photo. Auto-advances every 10s. */}
      <FeaturedCarousel items={featuredList} />

      <UnderlineTabs label="Filter draws" value={filter} onChange={setFilter} items={FILTERS} />

      {list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isLoading ? (
        <div className="grid gap-3 md:gap-4 lg:grid-cols-2 lg:gap-5 xl:grid-cols-3 items-start [&>*]:min-w-0">{Array.from({ length: 6 }, (_, i) => <CampaignCardSkeleton key={i} />)}</div>
      ) : campaigns.length === 0 && featuredList.length === 0 ? (
        filtered
          ? <EmptyState icon={SearchX} title="No matching draws" text="Try a different search, category or filter." action={<button onClick={() => { setQ(''); setCategory('all'); setFilter('all'); }} className="text-label font-semibold text-primary-text underline underline-offset-4">Clear filters</button>} />
          : <EmptyState icon={Store} title="No draws available right now." text="Check back soon — new prizes are added regularly." />
      ) : (
        <section aria-label="Draws" aria-live="polite" className={cx('grid gap-3 md:gap-4 lg:grid-cols-2 lg:gap-5 xl:grid-cols-3 items-start [&>*]:min-w-0', list.isFetching && 'opacity-80 transition-opacity')}>
          {campaigns.map((c) => <CampaignCard key={c.id} c={c} />)}
        </section>
      )}
    </div>
  );
}
