'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { Alert, Button, Field, PageTitle, Skeleton, inputCls } from '@/components/ui';

export default function Onboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const biz = useQuery({ queryKey: ['biz'], queryFn: () => api<{ business: any | null }>('/business/me') });
  const b = biz.data?.business;
  const [f, setF] = useState({ businessName: '', registrationNumber: '', contactEmail: '', contactPhone: '', representative: '', acceptTerms: false });
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const fe = (k: string) => err?.details?.[k]?.[0];

  // Start from the application opened at signup (its placeholders come from the account).
  useEffect(() => {
    if (!biz.data || loaded) return;
    if (b?.verificationStatus === 'VERIFIED') return router.replace('/business');
    if (b) setF({ businessName: b.businessName ?? '', registrationNumber: b.registrationNumber ?? '', contactEmail: b.contactEmail ?? '', contactPhone: b.contactPhone ?? '', representative: b.representative ?? '', acceptTerms: !!b.detailsSubmitted });
    setLoaded(true);
  }, [biz.data, b, loaded, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      await api('/business/onboard', { body: { ...f, registrationNumber: f.registrationNumber || undefined, contactPhone: f.contactPhone || undefined, acceptTerms: f.acceptTerms || undefined } });
      await qc.invalidateQueries({ queryKey: ['biz'] }); router.push('/business');
    } catch (e) { setErr(e as ApiError); setBusy(false); }
  }
  if (!loaded) return <Skeleton className="mx-auto h-96 max-w-xl" />;
  const resubmit = b?.verificationStatus === 'REJECTED';
  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title={b?.detailsSubmitted ? 'Update your business details' : 'Tell us about your business'} sub="We verify every sponsor before their prizes go live." />
      <form onSubmit={submit} className="space-y-4" noValidate>
        {err && !err.details && <Alert tone="error">{err.message}</Alert>}
        {resubmit && <Alert tone="warning" title="Previously declined">{b.rejectionReason}</Alert>}
        <Field label="Business name" error={fe('businessName')}><input className={inputCls} value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} /></Field>
        <Field label="CAC registration number" error={fe('registrationNumber')}><input className={inputCls} value={f.registrationNumber} onChange={(e) => setF({ ...f, registrationNumber: e.target.value })} /></Field>
        <Field label="Authorised representative" error={fe('representative')}><input className={inputCls} value={f.representative} onChange={(e) => setF({ ...f, representative: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact email" error={fe('contactEmail')}><input className={inputCls} type="email" value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} /></Field>
          <Field label="Contact phone" error={fe('contactPhone')}><input className={inputCls} type="tel" value={f.contactPhone} onChange={(e) => setF({ ...f, contactPhone: e.target.value })} /></Field>
        </div>
        <Alert>Verification documents are collected securely by our team after registration — please don’t email them.</Alert>
        <label className="flex items-start gap-2.5 text-label"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--primary)]" checked={f.acceptTerms} onChange={(e) => setF({ ...f, acceptTerms: e.target.checked })} /> I agree to the sponsor terms and confirm I’m authorised to represent this business.</label>
        {fe('acceptTerms') && <p role="alert" className="text-meta text-danger">You must accept the terms.</p>}
        <Button type="submit" size="lg" loading={busy}>{resubmit ? 'Resubmit for review' : b?.detailsSubmitted ? 'Save details' : 'Submit for verification'}</Button>
      </form>
    </div>
  );
}
