'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, CheckCircle2, Clock, Eye, EyeOff, Lock, Plus, Receipt, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDate, naira } from '@/lib/format';
import { useMe, useWallet } from '@/lib/hooks';
import { EmptyState, ErrorState, LinkButton, Micro, Sheet, Skeleton, buttonCls, cx } from '@/components/ui';

type Dep = { id: string; amount: number; status: 'INITIATED' | 'SUCCEEDED' | 'FAILED' | 'ABANDONED'; returnTo: string | null };

/** Shown after returning from checkout. Polls (with a server-side provider check) until the deposit settles. */
function DepositStatus({ id, onSettled }: { id: string; onSettled: () => void }) {
  const router = useRouter();
  const q = useQuery({
    queryKey: ['deposit', id],
    queryFn: () => api<{ deposit: Dep }>(`/me/wallet/deposits/${id}?refresh=1`),
    refetchInterval: (query) => (query.state.data?.deposit.status === 'INITIATED' && query.state.dataUpdateCount < 60 ? 2500 : false),
  });
  const d = q.data?.deposit;
  useEffect(() => {
    if (d && d.status !== 'INITIATED') onSettled();
    if (d?.status === 'SUCCEEDED' && d.returnTo) {
      const t = setTimeout(() => router.push(d.returnTo!), 2200);
      return () => clearTimeout(t);
    }
  }, [d?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  if (q.isError) return null;
  if (!d) return <Skeleton className="h-16 w-full" />;
  const ok = d.status === 'SUCCEEDED', pending = d.status === 'INITIATED';
  const Icon = ok ? CheckCircle2 : pending ? Clock : XCircle;
  return (
    <div role="status" className={cx('fade-up flex items-center gap-3 rounded-2xl border px-4 py-3.5', ok ? 'border-primary-soft-border bg-primary-soft' : pending ? 'border-warning-border bg-warning-soft' : 'border-danger-border bg-danger-soft')}>
      <Icon className={cx('h-6 w-6 shrink-0', ok ? 'text-primary' : pending ? 'text-warning' : 'text-danger')} aria-hidden />
      <div className="min-w-0 flex-1 text-label">
        <p className="font-semibold text-ink">{ok ? `${naira(d.amount)} added to your wallet` : pending ? 'Confirming your deposit…' : 'Deposit not completed'}</p>
        <p className="text-muted">{ok ? (d.returnTo ? 'Taking you back to your draw…' : 'You can now enter draws with your balance.') : pending ? 'This usually takes a few seconds.' : 'No money was added. You can try again.'}</p>
      </div>
      {ok && d.returnTo && <LinkButton href={d.returnTo} size="sm">Continue</LinkButton>}
    </div>
  );
}

export default function Wallet() {
  const me = useMe();
  const router = useRouter();
  const qc = useQueryClient();
  const user = me.data?.user;
  const [hidden, setHidden] = useState(false);
  const [returned, setReturned] = useState<string | null>(null);
  const [pinPrompt, setPinPrompt] = useState(false);
  const w = useWallet(!!user);
  const t = useQuery({ queryKey: ['wallet-tx'], queryFn: () => api<{ transactions: { id: string; direction: 'CREDIT' | 'DEBIT'; amount: number; kind: string; description: string; createdAt: string; affectsBalance: boolean }[] }>('/me/wallet/transactions?pageSize=50'), enabled: !!user });

  // ?deposit=<id> is the return from checkout.
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('deposit');
    if (v === 'new') router.replace('/wallet/deposit');
    else if (v) { setReturned(v); window.history.replaceState(null, '', '/wallet'); }
  }, [router]);
  // Reference behaviour: prompt for a PIN on the wallet until one exists (dismissible; withdrawals enforce it).
  useEffect(() => {
    if (!user || user.hasPin) return;
    try { if (sessionStorage.getItem('pin-prompt-dismissed')) return; } catch { /* storage unavailable */ }
    setPinPrompt(true);
  }, [user]);
  const dismissPin = () => { setPinPrompt(false); try { sessionStorage.setItem('pin-prompt-dismissed', '1'); } catch { /* ignore */ } };

  const money = (v: number | undefined) => (hidden ? '₦•••••' : naira(v ?? 0));
  const refresh = () => { qc.invalidateQueries({ queryKey: ['wallet'] }); qc.invalidateQueries({ queryKey: ['wallet-tx'] }); };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface-2 text-ink hover:bg-surface-3"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-display font-bold">Wallet</h1>
      </div>
      {me.isLoading ? <Skeleton className="h-48 w-full" /> : !user ? (
        <EmptyState icon={Receipt} title="Log in to see your wallet" action={<LinkButton href="/login?next=/wallet">Log in</LinkButton>} />
      ) : (
        <>
          {returned && <DepositStatus id={returned} onSettled={refresh} />}

          <section className="py-8 text-center" aria-label="Balance">
            <p className="inline-flex items-center gap-2 text-label font-medium text-muted">
              NGN wallet balance
              <button onClick={() => setHidden(!hidden)} aria-label={hidden ? 'Show balance' : 'Hide balance'} className="rounded-md p-1 text-muted hover:bg-surface-2">{hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </p>
            {w.data ? <p className="tabular mt-2 text-[2.125rem] font-extrabold leading-tight tracking-[-0.03em] text-ink">{money(w.data.balance)}</p> : <Skeleton className="mx-auto mt-2 h-12 w-44" />}
            <div className="mx-auto mt-6 inline-grid grid-cols-2 gap-1.5 rounded-full bg-surface-2 p-1.5">
              <Link href="/wallet/deposit" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-surface px-6 text-body font-bold text-ink shadow-sm transition-colors hover:bg-primary-soft">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-strong text-white"><Plus className="h-4 w-4" strokeWidth={2.75} aria-hidden /></span>Deposit
              </Link>
              <Link href={user.hasPin ? '/wallet/withdraw' : '/pin/create?returnUrl=/wallet/withdraw'} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-surface px-6 text-body font-bold text-ink shadow-sm transition-colors hover:bg-primary-soft">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-strong text-white"><ArrowUpRight className="h-4 w-4" strokeWidth={2.75} aria-hidden /></span>Withdraw
              </Link>
            </div>
            <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1.5">
              <div className="rounded-xl bg-surface px-4 py-3"><Micro>Deposited</Micro><p className="tabular mt-0.5 text-body font-bold text-ink">{money(w.data?.totalDeposited)}</p></div>
              <div className="rounded-xl bg-surface px-4 py-3"><Micro>Spent on entries</Micro><p className="tabular mt-0.5 text-body font-bold text-ink">{money(w.data?.totalSpent)}</p></div>
            </div>
            <p className="mx-auto mt-5 max-w-md text-meta text-muted">Deposits and withdrawals are processed securely by Paystack.</p>
          </section>

          <h2 className="mb-3 text-heading font-bold">Activity</h2>
          {t.isError ? <ErrorState onRetry={() => t.refetch()} /> : !t.data ? <Skeleton className="h-48 w-full" /> : t.data.transactions.length === 0 ? (
            <EmptyState icon={Receipt} title="No transactions yet" text="Deposits, entries and refunds will appear here." action={<LinkButton href="/wallet/deposit">Make your first deposit</LinkButton>} />
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {t.data.transactions.map((x) => {
                const credit = x.direction === 'CREDIT';
                return (
                  <li key={x.id} className="flex items-center gap-3.5 px-4 py-3.5">
                    <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', credit ? 'bg-primary-soft text-primary-text' : 'bg-surface-2 text-muted')}>{credit ? <ArrowDownLeft className="h-4.5 w-4.5" aria-label="Money in" /> : <ArrowUpRight className="h-4.5 w-4.5" aria-label="Money out" />}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label font-semibold text-ink">{x.description}</p>
                      <p className="text-meta text-muted">{fmtDate(x.createdAt)}{!x.affectsBalance && ' · paid by card'}</p>
                    </div>
                    <p className={cx('tabular text-label font-bold', credit ? 'text-primary-text' : 'text-ink')}>{credit ? '+' : '−'}{hidden ? '•••' : naira(x.amount)}</p>
                  </li>
                );
              })}
            </ul>
          )}
          <Sheet open={pinPrompt} onClose={dismissPin} title="Create a Unique PIN to Proceed">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Lock className="h-4.5 w-4.5" aria-hidden /></span>
              <p className="text-body text-muted">Please create a unique PIN to continue. Without it you won’t be able to withdraw or claim prizes safely.</p>
            </div>
            <Link href="/pin/create?returnUrl=/wallet" className={cx(buttonCls('primary', 'lg', true), 'mt-6')}>Create PIN</Link>
            <button onClick={dismissPin} className="mt-2 h-11 w-full text-label font-semibold text-muted hover:text-ink">Not now</button>
          </Sheet>
        </>
      )}
    </div>
  );
}
