'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Bell, BellRing, CheckCircle2, Gift, RotateCcw, Shield, Ticket, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { useMe } from '@/lib/hooks';
import { Button, EmptyState, ErrorState, LinkButton, Skeleton, cx } from '@/components/ui';

type N = { id: string; type: string; title: string; message: string; destination: string | null; readAt: string | null; createdAt: string };

const ICON: Record<string, [React.ComponentType<{ className?: string }>, string]> = {
  PURCHASE_CONFIRMED: [Ticket, 'bg-primary-soft text-primary-text'],
  YOU_WON: [Trophy, 'bg-primary-soft text-primary-text'],
  RESULT_PUBLISHED: [CheckCircle2, 'bg-primary-soft text-primary-text'],
  CLAIM_UPDATE: [Gift, 'bg-primary-soft text-primary-text'],
  PAYMENT_FAILED: [AlertTriangle, 'bg-danger-soft text-danger'],
  CAMPAIGN_CANCELLED: [AlertTriangle, 'bg-danger-soft text-danger'],
  REFUND: [RotateCcw, 'bg-warning-soft text-warning'],
  SECURITY: [Shield, 'bg-warning-soft text-warning'],
};

export default function Notifications() {
  const me = useMe();
  const qc = useQueryClient();
  const router = useRouter();
  const user = me.data?.user;
  const [view, setView] = useState<'all' | 'unread'>('all');
  const q = useInfiniteQuery({
    queryKey: ['notifications'], initialPageParam: 1, enabled: !!user, refetchInterval: 30_000,
    queryFn: ({ pageParam }) => api<{ notifications: N[]; total: number; unread: number; page: number; pageSize: number }>(`/me/notifications?page=${pageParam}&pageSize=20`),
    getNextPageParam: (l) => (l.page * l.pageSize < l.total ? l.page + 1 : undefined),
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['me'] }); };
  const readAll = useMutation({ mutationFn: () => api('/me/notifications/read-all', { method: 'POST', body: {} }), onSuccess: refresh });
  const readOne = useMutation({ mutationFn: (id: string) => api(`/me/notifications/${id}/read`, { method: 'PATCH', body: {} }), onSuccess: refresh });

  const all = q.data?.pages.flatMap((p) => p.notifications) ?? [];
  const items = view === 'unread' ? all.filter((n) => !n.readAt) : all;
  const unread = q.data?.pages[0]?.unread ?? 0;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 grid grid-cols-[2.5rem_1fr_auto] items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface-2 text-ink hover:bg-surface-3"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-display font-bold">Notifications</h1>
        {unread > 0 ? <Button variant="ghost" size="sm" onClick={() => readAll.mutate()} loading={readAll.isPending}>Mark all as read</Button> : <span />}
      </div>
      {me.isLoading ? <Skeleton className="h-40 w-full" /> : !user ? (
        <EmptyState icon={Bell} title="Log in to see notifications" action={<LinkButton href="/login?next=/notifications">Log in</LinkButton>} />
      ) : (
        <>
          <div role="radiogroup" aria-label="Show" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
            {(['all', 'unread'] as const).map((v) => (
              <button key={v} role="radio" aria-checked={view === v} onClick={() => setView(v)} className={cx('h-9 rounded-lg text-label font-semibold transition-colors', view === v ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}>
                {v === 'all' ? 'All' : `Unread${unread ? ` (${unread})` : ''}`}
              </button>
            ))}
          </div>
          {q.isError ? <ErrorState onRetry={() => q.refetch()} /> : q.isLoading ? <Skeleton className="h-48 w-full" /> : items.length === 0 ? (
            <EmptyState icon={BellRing} title={view === 'unread' ? 'You’re all caught up' : 'No notifications yet'} text={view === 'unread' ? 'There’s nothing new since your last visit.' : 'Purchase confirmations, draw updates and results will show up here.'} />
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {items.map((n) => {
                const [Icon, tone] = ICON[n.type] ?? [Bell, 'bg-surface-2 text-muted'];
                return (
                  <li key={n.id}>
                    <button onClick={() => { if (!n.readAt) readOne.mutate(n.id); if (n.destination) router.push(n.destination); }} className="flex w-full items-start gap-3.5 px-4 py-4 text-left transition-colors hover:bg-surface-2">
                      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', tone)}><Icon className="h-4.5 w-4.5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className={cx('block text-label text-ink', n.readAt ? 'font-medium' : 'font-bold')}>{n.title}</span>
                        <span className="mt-0.5 block text-label text-muted">{n.message}</span>
                        <span className="mt-1 block text-meta text-subtle">{fmtDate(n.createdAt)}</span>
                      </span>
                      {!n.readAt && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {q.hasNextPage && <div className="mt-5 text-center"><Button variant="outline" onClick={() => q.fetchNextPage()} loading={q.isFetchingNextPage}>Load more</Button></div>}
          <p className="mt-6 text-center text-meta text-muted">Manage email alerts in <Link href="/profile" className="font-semibold text-ink underline underline-offset-2">Profile</Link>.</p>
        </>
      )}
    </div>
  );
}
