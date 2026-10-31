import Link from 'next/link';
import { ArrowRight, BadgeCheck, Clock, Flame, Ticket, Trophy, Users } from 'lucide-react';
import type { Campaign } from '@/lib/types';
import { naira, nairaCompact, pct, shortDate } from '@/lib/format';
import { MetaRow, Micro, ProgressBar, StatusBadge, buttonCls, cx } from './ui';

function ctaLabel(c: Campaign) {
  if (c.status === 'OPEN') return 'Enter draw';
  if (c.status === 'COMPLETED') return 'See winning ticket';
  if (c.status === 'DRAW_IN_PROGRESS') return 'Watch the draw';
  return 'View details';
}

function PrizeAvatar({ c, size = 'md' }: { c: Campaign; size?: 'md' | 'lg' }) {
  return (
    <span className={cx('relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 ring-1 ring-line', size === 'lg' ? 'h-[52px] w-[52px] sm:h-14 sm:w-14' : 'h-10 w-10 sm:h-12 sm:w-12')}>
      <Ticket className="absolute h-4 w-4 text-subtle sm:h-5 sm:w-5" aria-hidden />
      {c.images[0] && (
        <img src={c.images[0].url} alt="" loading="lazy"
          // A missing image hides itself so the ticket placeholder shows instead of a broken icon.
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          className="relative h-full w-full object-cover" />
      )}
    </span>
  );
}

const CARD = 'rounded-[22px] bg-surface shadow-[0_1px_2px_rgb(16_35_26/0.04),0_8px_28px_rgb(16_35_26/0.06)] transition-shadow duration-200 hover:shadow-[0_2px_4px_rgb(16_35_26/0.05),0_12px_32px_rgb(16_35_26/0.09)] dark:border dark:border-line';

/** Quick pick (no box, reference style): opens the draw with this quantity pre-selected. */
function QuickPick({ href, icon: Icon, label, price }: { href: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; price: number }) {
  return (
    <Link href={href} className="group/pick flex min-w-0 items-center gap-2.5 rounded-xl py-1 pr-2 transition-colors">
      <Icon className="h-6 w-6 shrink-0 text-ink/80 transition-colors group-hover/pick:text-primary" strokeWidth={1.75} />
      <span className="min-w-0 leading-tight">
        <span className="block whitespace-nowrap text-body font-bold text-ink group-hover/pick:text-primary-text">{label}</span>
        <span className="tabular block text-label text-muted">{naira(price)}</span>
      </span>
    </Link>
  );
}

const Divider = () => <span className="h-8 w-px shrink-0 bg-line-strong" aria-hidden />;
const SmallDivider = () => <span className="h-4 w-px shrink-0 bg-line-strong" aria-hidden />;

function Stat({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap"><Icon className="h-4 w-4 shrink-0" />{children}</span>;
}

export default function CampaignCard({ c, featured }: { c: Campaign; featured?: boolean }) {
  const open = c.status === 'OPEN';
  const href = `/campaigns/${c.slug}`;
  const max = Math.min(c.maxTicketsPerUser, c.ticketsRemaining);
  const p = pct(c.ticketsSold, c.capacity);
  return (
    <article className={cx(CARD, 'flex flex-col p-4 sm:p-5')}>
      <Link href={href} className="group flex items-center gap-3.5">
        <PrizeAvatar c={c} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-heading font-bold leading-snug text-ink group-hover:underline">{c.title}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-label text-muted">
            <span className="truncate">{c.sponsorName}</span>
            {c.sponsorVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified sponsor" />}
          </p>
        </div>
        {featured && open
          ? <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-primary-soft px-2.5 py-1 text-meta font-semibold text-primary-text"><Trophy className="h-3 w-3" aria-hidden />Featured</span>
          : <StatusBadge status={c.status} className="shrink-0 self-start rounded-full px-2.5 py-1" />}
      </Link>

      {open ? (
        <>
          <div className="mt-4"><ProgressBar sold={c.ticketsSold} capacity={c.capacity} label={false} /></div>
          <div className="mt-3.5 flex items-center gap-3">
            <QuickPick href={`${href}?qty=1`} icon={Ticket} label="1 ticket" price={c.ticketPrice} />
            {max > 1 && <><Divider /><QuickPick href={`${href}?qty=${max}`} icon={Users} label={`${max} tickets`} price={c.ticketPrice * max} /></>}
            <span className="ml-auto shrink-0 text-right leading-tight">
              <span className="tabular block text-title font-extrabold text-primary-text">{p}%</span>
              <span className="text-label text-muted">sold</span>
            </span>
          </div>
          <Link href={href} className={cx(buttonCls('primary', 'lg', true), 'group/btn mt-4 rounded-2xl')}>
            Enter draw<ArrowRight className="h-4.5 w-4.5 transition-transform group-hover/btn:translate-x-0.5" aria-hidden />
          </Link>
          <div className="mt-3.5 flex items-center justify-between gap-3 px-1 text-label text-muted">
            <span className="flex min-w-0 items-center gap-3">
              <Stat icon={Users}><span className="tabular">{c.ticketsSold.toLocaleString()} sold</span></Stat>
              <SmallDivider />
              <Stat icon={Clock}>{c.drawScheduledAt ? `Draw ${shortDate(c.drawScheduledAt)}` : 'When sold out'}</Stat>
            </span>
            <span className="tabular shrink-0 font-bold text-primary-text">{p}%</span>
          </div>
        </>
      ) : (
        <Link href={href} className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-surface-2 px-3.5 py-3 text-label text-muted transition-colors hover:bg-surface-3 sm:text-meta">
          <span className="flex min-w-0 items-center gap-2.5 overflow-hidden">
            <Stat icon={Ticket}><span className="tabular">{c.ticketsSold.toLocaleString()} sold</span></Stat>
            <SmallDivider />
            <span className="contents max-[374px]:hidden">
              <Stat icon={Flame}><span className="tabular">{nairaCompact(c.ticketPrice * c.ticketsSold)}</span></Stat>
              <SmallDivider />
            </span>
            {c.result
              ? <Stat icon={Trophy}><span className="tabular font-semibold text-primary-text">Winner #{c.result.winningTicketNumber}</span></Stat>
              : <Stat icon={Clock}>{c.status === 'CANCELLED' ? 'Cancelled' : 'Draw soon'}</Stat>}
          </span>
          <span className="tabular shrink-0 text-heading font-extrabold text-primary-text sm:text-body">{p}%</span>
        </Link>
      )}
    </article>
  );
}

export function FeaturedCampaign({ c }: { c: Campaign }) {
  return (
    <Link href={`/campaigns/${c.slug}`} className="group grid overflow-hidden rounded-2xl border border-line bg-surface transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-[0_4px_24px_rgb(16_35_26/0.07)] md:grid-cols-[1.15fr_1fr]">
      <div className="relative aspect-[16/10] bg-surface-2 md:aspect-auto md:min-h-[300px]">
        {c.images[0] && <img src={c.images[0].url} alt={c.images[0].alt ?? c.title} className="absolute inset-0 h-full w-full object-cover" />}
      </div>
      <div className="flex flex-col justify-center p-5 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-meta font-semibold text-primary-text"><Trophy className="h-3.5 w-3.5" aria-hidden /> Featured · {c.category.name}</span>
          <StatusBadge status={c.status} />
        </div>
        <h2 className="mt-3 text-title font-bold">{c.title}</h2>
        <p className="mt-1 flex items-center gap-1 text-label text-muted">by {c.sponsorName}{c.sponsorVerified && <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verified sponsor" />}</p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div><p className="tabular text-display font-bold text-ink">{naira(c.ticketPrice)}</p><Micro>per ticket</Micro></div>
          <div className="text-right"><p className="tabular text-display font-bold text-primary-text">{pct(c.ticketsSold, c.capacity)}%</p><Micro>sold</Micro></div>
        </div>
        <div className="mt-3"><ProgressBar sold={c.ticketsSold} capacity={c.capacity} label={false} /></div>
        <MetaRow className="mt-3" items={[
          { icon: Ticket, label: <span className="tabular">{c.ticketsRemaining.toLocaleString()} of {c.capacity.toLocaleString()} left</span> },
          { icon: Clock, label: 'Draw after sell-out' },
        ]} />
        <span className={cx(buttonCls('primary', 'lg', true), 'mt-6')}>Enter draw</span>
      </div>
    </Link>
  );
}

/** Phone-sized featured card: square photo + details, then stats and the call to action. */
export function FeaturedCompact({ c }: { c: Campaign }) {
  const open = c.status === 'OPEN';
  return (
    <Link href={`/campaigns/${c.slug}`} aria-label={`Featured: ${c.title}`} className={cx(CARD, 'group block p-3.5')}>
      <div className="flex gap-3.5">
        <div className="relative flex h-[104px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-2 max-[374px]:h-[88px] max-[374px]:w-[88px]">
          <Ticket className="absolute h-6 w-6 text-subtle" aria-hidden />
          {c.images[0] && (
            <img src={c.images[0].url} alt={c.images[0].alt ?? c.title} onError={(e) => { e.currentTarget.style.display = 'none'; }}
              className="relative h-full w-full object-cover text-[0px] transition-transform duration-500 group-hover:scale-105" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1 text-meta font-semibold text-primary-text">
              <Trophy className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="truncate">Featured<span className="max-[374px]:hidden"> · {c.category.name}</span></span>
            </span>
            <StatusBadge status={c.status} className="shrink-0 rounded-full px-2" />
          </div>
          <h2 className="mt-1 line-clamp-2 text-[0.9375rem] font-bold leading-snug tracking-[-0.01em]">{c.title}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-label text-muted">
            <span className="truncate">by {c.sponsorName}</span>
            {c.sponsorVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Verified sponsor" />}
          </p>
          <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
            <p className="tabular leading-none"><span className="text-[1.0625rem] font-extrabold text-ink">{naira(c.ticketPrice)}</span><span className="text-label text-muted"> / ticket</span></p>
            <p className="tabular text-right leading-none"><span className="block text-[1.0625rem] font-extrabold text-primary-text">{pct(c.ticketsSold, c.capacity)}%</span><span className="text-meta text-muted">sold</span></p>
          </div>
          <div className="mt-2"><ProgressBar sold={c.ticketsSold} capacity={c.capacity} label={false} size="sm" /></div>
        </div>
      </div>

      <div className="mt-3.5 flex items-center gap-2 border-t border-line pt-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-meta text-muted">
          <span className="flex shrink-0 items-center gap-1.5"><Ticket className="h-3.5 w-3.5" aria-hidden /><span className="tabular">{c.ticketsRemaining.toLocaleString()} of {c.capacity.toLocaleString()} left</span></span>
          <span className="h-4 w-px shrink-0 bg-line-strong max-[374px]:hidden" aria-hidden />
          <span className="flex min-w-0 items-center gap-1.5 max-[374px]:hidden"><Clock className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="truncate">{c.drawScheduledAt ? `Draw ${shortDate(c.drawScheduledAt)}` : 'Draw at sell-out'}</span></span>
        </div>
        <span className={cx(buttonCls(open ? 'primary' : 'secondary', 'sm'), 'h-10 shrink-0 gap-1.5 rounded-xl px-3.5 text-label')}>
          {open ? <>Enter draw<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></> : ctaLabel(c)}
        </span>
      </div>
    </Link>
  );
}

export function CampaignCardSkeleton() {
  return (
    <div className={cx(CARD, 'p-4 sm:p-5')}>
      <div className="flex items-center gap-3.5"><div className="skeleton h-[52px] w-[52px] shrink-0 rounded-full sm:h-14 sm:w-14" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/3" /></div></div>
      <div className="skeleton mt-4 h-2 w-full" />
      <div className="mt-3.5 flex gap-3"><div className="skeleton h-10 flex-1" /><div className="skeleton h-10 flex-1" /></div>
      <div className="skeleton mt-4 h-12 w-full rounded-2xl" />
      <div className="skeleton mt-3.5 h-4 w-full" />
    </div>
  );
}
