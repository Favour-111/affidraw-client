'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { naira } from '@/lib/format';
import { newIdempotencyKey, useMe, useWallet } from '@/lib/hooks';
import FlowHeader from '@/components/FlowHeader';
import AmountPad from '@/components/AmountPad';
import { Skeleton } from '@/components/ui';

export default function Deposit() {
  const router = useRouter();
  const me = useMe();
  const user = me.data?.user;
  const wallet = useWallet(!!user);
  const [params, setParams] = useState<{ amount: string; returnTo?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const a = Number(sp.get('amount') || 0);
    const r = sp.get('returnTo');
    setParams({ amount: a > 0 ? String(Math.max(200, Math.ceil(a))) : '', returnTo: r && r.startsWith('/') && !r.startsWith('//') ? r : undefined });
  }, []);
  useEffect(() => { if (me.isSuccess && !user) router.replace('/login?next=/wallet/deposit'); }, [me.isSuccess, user, router]);

  async function go(kobo: number) {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ deposit: { id: string; authorizationUrl: string | null } }>('/me/wallet/deposits', { body: { amount: kobo, returnTo: params?.returnTo }, headers: { 'Idempotency-Key': key.current } });
      window.location.href = r.deposit.authorizationUrl ?? `/wallet?deposit=${r.deposit.id}`;
    } catch (e) {
      setErr((e as ApiError).message);
      key.current = newIdempotencyKey();
      setBusy(false);
    }
  }

  return (
    <>
      <FlowHeader title="Deposit to NGN wallet" subtitle={wallet.data ? `Current balance: ${naira(wallet.data.balance)}` : ' '} closeHref={params?.returnTo ?? '/wallet'} />
      {!params || !user ? <Skeleton className="mt-20 h-64 w-full" /> : (
        <AmountPad key={params.amount} initial={params.amount} min={200} max={1_000_000} busy={busy} error={err} onContinue={go} />
      )}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-meta text-muted"><Lock className="h-3.5 w-3.5" aria-hidden />Paid securely with Paystack</p>
    </>
  );
}
