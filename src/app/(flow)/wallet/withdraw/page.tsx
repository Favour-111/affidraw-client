'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, ChevronRight, Clock, Plus, ShieldAlert, XCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { naira } from '@/lib/format';
import { newIdempotencyKey, useMe, useWallet } from '@/lib/hooks';
import FlowHeader from '@/components/FlowHeader';
import AmountPad from '@/components/AmountPad';
import PinPad from '@/components/PinPad';
import { Alert, Button, Field, LinkButton, Skeleton, cx, inputCls } from '@/components/ui';

type Account = { id: string; bankName: string; accountName: string; last4: string };
type W = { id: string; amount: number; status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED'; failureReason: string | null; account: Account };

function AddAccount({ onAdded }: { onAdded: (a: Account) => void }) {
  const banks = useQuery({ queryKey: ['banks'], queryFn: () => api<{ banks: { code: string; name: string }[] }>('/me/banks'), staleTime: 3600_000 });
  const [bankCode, setBankCode] = useState('');
  const [num, setNum] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ok = !!bankCode && /^\d{10}$/.test(num);
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!ok) return;
    setBusy(true); setErr(null);
    try { onAdded((await api<{ account: Account }>('/me/payout-accounts', { body: { bankCode, accountNumber: num } })).account); }
    catch (e) { setErr((e as ApiError).message); setBusy(false); }
  }
  return (
    <form onSubmit={add} className="space-y-4 rounded-2xl border border-line p-4">
      <p className="text-label font-bold text-ink">Add a bank account</p>
      <Field label="Bank" required>
        <select className={inputCls} value={bankCode} onChange={(e) => setBankCode(e.target.value)} disabled={!banks.data}>
          <option value="">{banks.data ? 'Select your bank' : 'Loading banks…'}</option>
          {banks.data?.banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
        </select>
      </Field>
      <Field label="Account number" required hint="We’ll confirm the account name with your bank.">
        <input className={cx(inputCls, 'tabular tracking-wider')} inputMode="numeric" maxLength={10} placeholder="10-digit NUBAN" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 10))} />
      </Field>
      {err && <Alert tone="error">{err}</Alert>}
      <Button type="submit" full loading={busy} disabled={!ok}>Verify and save account</Button>
      <p className="text-meta text-muted">Withdrawals can only go to an account in your own name.</p>
    </form>
  );
}

function Result({ id }: { id: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['withdrawal', id],
    queryFn: () => api<{ withdrawal: W; balance: number }>(`/me/withdrawals/${id}?refresh=1`),
    refetchInterval: (query) => (['PENDING', 'PROCESSING'].includes(query.state.data?.withdrawal.status ?? 'PENDING') && query.state.dataUpdateCount < 40 ? 3000 : false),
  });
  useEffect(() => { if (q.data) { qc.invalidateQueries({ queryKey: ['wallet'] }); qc.invalidateQueries({ queryKey: ['wallet-tx'] }); } }, [q.data?.withdrawal.status]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!q.data) return <Skeleton className="mt-16 h-64 w-full" />;
  const w = q.data.withdrawal;
  const ok = w.status === 'SUCCEEDED', failed = w.status === 'FAILED';
  const Icon = ok ? CheckCircle2 : failed ? XCircle : Clock;
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Icon className={cx('pop h-14 w-14', ok ? 'text-primary' : failed ? 'text-danger' : 'text-warning')} strokeWidth={1.75} aria-hidden />
      <h2 className="mt-5 text-display font-bold">{ok ? 'Withdrawal sent' : failed ? 'Withdrawal didn’t go through' : 'Withdrawal processing'}</h2>
      <p className="tabular mt-3 text-[1.875rem] font-extrabold leading-tight tracking-[-0.02em] text-ink">{naira(w.amount)}</p>
      <p className="mt-1 text-body text-muted">to {w.account.bankName} ••{w.account.last4} · {w.account.accountName}</p>
      <p className="mt-4 max-w-xs text-label text-muted">{ok ? 'Most transfers arrive within minutes.' : failed ? 'The money is back in your wallet. You can try again.' : 'Your bank transfer is on its way. We’ll notify you when it lands.'}</p>
      <div className="mt-10 w-full max-w-sm space-y-2">
        <LinkButton href="/wallet" full size="lg">Back to wallet</LinkButton>
      </div>
    </div>
  );
}

export default function Withdraw() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  const user = me.data?.user;
  const wallet = useWallet(!!user);
  const accounts = useQuery({ queryKey: ['payout-accounts'], queryFn: () => api<{ accounts: Account[] }>('/me/payout-accounts'), enabled: !!user });
  const [step, setStep] = useState<'amount' | 'account' | 'pin' | 'result'>('amount');
  const [amount, setAmount] = useState(0);
  const [account, setAccount] = useState<Account | null>(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(0);
  const [resultId, setResultId] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  useEffect(() => {
    if (!me.isSuccess) return;
    if (!user) router.replace('/login?next=/wallet/withdraw');
    else if (!user.hasPin) router.replace('/pin/create?returnUrl=/wallet/withdraw');
  }, [me.isSuccess, user, router]);
  useEffect(() => { if (accounts.data && !account && accounts.data.accounts[0]) setAccount(accounts.data.accounts[0]); }, [accounts.data, account]);

  const balance = wallet.data?.balance ?? 0;
  const confirm = useCallback(async (pin: string) => {
    if (!account) return;
    setBusy(true); setErr(null);
    try {
      const r = await api<{ withdrawal: { id: string } }>('/me/withdrawals', { body: { amount, payoutAccountId: account.id, pin }, headers: { 'Idempotency-Key': key.current } });
      setResultId(r.withdrawal.id); setStep('result');
      qc.invalidateQueries({ queryKey: ['wallet'] });
    } catch (e) {
      const ae = e as ApiError;
      setErr(ae.message); setReset((x) => x + 1);
      if (ae.code !== 'INVALID_PIN') key.current = newIdempotencyKey();
    } finally {
      setBusy(false);
    }
  }, [account, amount, qc]);

  const back = useMemo(() => ({ account: () => setStep('amount'), pin: () => { setStep('account'); setErr(null); } } as Record<string, () => void>), []);

  if (!user || !user.hasPin) return <Skeleton className="mt-20 h-64 w-full" />;
  if (user.verificationStatus !== 'VERIFIED') {
    return (
      <>
        <FlowHeader title="Withdraw Cash" />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <ShieldAlert className="h-12 w-12 text-warning" strokeWidth={1.75} aria-hidden />
          <h2 className="mt-5 text-display font-bold">Verify your identity to withdraw</h2>
          <p className="mt-2 max-w-sm text-body text-muted">For your security and to meet financial regulations, withdrawals are available once your identity is verified.</p>
          <div className="mt-8 w-full max-w-sm space-y-2">
            <LinkButton href="mailto:support@raffler.example?subject=Identity%20verification" full size="lg">Contact support to verify</LinkButton>
            <LinkButton href="/wallet" variant="outline" full size="lg">Back to wallet</LinkButton>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <FlowHeader title="Withdraw Cash" subtitle={step === 'result' ? undefined : wallet.data ? `Current balance: ${naira(balance)}` : ' '} onBack={back[step]} />
      {step === 'amount' && (
        wallet.data
          ? <AmountPad initial={amount ? String(amount / 100) : ''} min={150} max={Math.max(150, balance / 100)} maxError={balance < 15000 ? 'Your balance is below the ₦150 minimum' : `You can withdraw up to ${naira(balance)}`} onContinue={(k) => { setAmount(k); setStep('account'); }} />
          : <Skeleton className="mt-20 h-64 w-full" />
      )}

      {step === 'account' && (
        <div className="mt-8 flex flex-1 flex-col">
          <p className="text-center text-label text-muted">Withdrawing</p>
          <p className="tabular mt-2 text-center text-[1.875rem] font-extrabold leading-tight tracking-[-0.02em] text-ink">{naira(amount)}</p>
          <h2 className="mb-3 mt-8 text-label font-bold">Send to</h2>
          {!accounts.data ? <Skeleton className="h-20 w-full" /> : (
            <div className="space-y-2">
              {accounts.data.accounts.map((a) => (
                <button key={a.id} type="button" onClick={() => setAccount(a)} aria-pressed={account?.id === a.id}
                  className={cx('flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition-colors', account?.id === a.id ? 'border-primary bg-primary-soft' : 'border-line hover:bg-surface-2')}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"><Building2 className="h-4.5 w-4.5" aria-hidden /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-body font-semibold text-ink">{a.accountName}</span><span className="block text-meta text-muted">{a.bankName} ••{a.last4}</span></span>
                  <span aria-hidden className={cx('h-5 w-5 shrink-0 rounded-full border-2', account?.id === a.id ? 'border-[6px] border-primary' : 'border-line-strong')} />
                </button>
              ))}
              {adding || accounts.data.accounts.length === 0
                ? <AddAccount onAdded={(a) => { qc.invalidateQueries({ queryKey: ['payout-accounts'] }); setAccount(a); setAdding(false); }} />
                : <button type="button" onClick={() => setAdding(true)} className="flex w-full items-center gap-3.5 rounded-2xl border border-dashed border-line-strong p-4 text-left text-label font-semibold text-primary-text hover:bg-surface-2"><Plus className="h-4.5 w-4.5" aria-hidden />Add another bank account</button>}
            </div>
          )}
          <div className="mt-auto pt-8">
            <Button full size="lg" disabled={!account || adding} onClick={() => { setErr(null); setStep('pin'); setReset((x) => x + 1); }}>Continue <ChevronRight className="h-4.5 w-4.5" aria-hidden /></Button>
          </div>
        </div>
      )}

      {step === 'pin' && account && (
        <>
          <div className="mt-8 text-center">
            <h2 className="text-display font-bold">Enter your PIN</h2>
            <p className="mx-auto mt-2 max-w-xs text-body text-muted">Confirm <strong className="tabular text-ink">{naira(amount)}</strong> to {account.bankName} ••{account.last4}</p>
            <Link href="/pin/create?returnUrl=/wallet/withdraw" className="mt-2 inline-block text-meta font-semibold text-muted hover:text-ink">Forgot PIN?</Link>
          </div>
          <PinPad onComplete={confirm} error={err} busy={busy} resetKey={reset} />
        </>
      )}

      {step === 'result' && resultId && <Result id={resultId} />}
    </>
  );
}
