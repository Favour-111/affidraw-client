'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Alert, Button, Card } from '@/components/ui';

/** Development-only stand-in for the provider's hosted checkout. The backend refuses it in production. */
export default function DevPay() {
  const { reference } = useParams<{ reference: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function go(outcome: 'success' | 'failed') {
    setBusy(outcome); setErr(null);
    try {
      const r = await api<{ kind: 'purchase' | 'deposit'; purchaseId?: string; depositId?: string }>(`/dev/payments/${reference}/complete`, { body: { outcome } });
      // Same landing pages the real provider's callback URL uses.
      router.replace(r.kind === 'deposit' ? `/wallet?deposit=${r.depositId}` : `/purchases/${r.purchaseId}`);
    } catch (e) { setErr((e as ApiError).message); setBusy(null); }
  }
  return (
    <div className="mx-auto max-w-md space-y-4">
      <Alert tone="warning"><strong>Test payment page.</strong> No real money moves. This page exists only while the mock payment provider is active and is disabled in production.</Alert>
      <Card className="space-y-3 p-5">
        <h1 className="text-display font-bold">Simulated checkout</h1>
        <p className="break-all font-mono text-meta text-muted">{reference}</p>
        {err && <Alert tone="error">{err}</Alert>}
        <Button full loading={busy === 'success'} onClick={() => go('success')}>Simulate successful payment</Button>
        <Button full variant="outline" loading={busy === 'failed'} onClick={() => go('failed')}>Simulate failed payment</Button>
      </Card>
    </div>
  );
}
