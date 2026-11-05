'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BUSINESS_EMAIL, businessMailto } from '@/lib/contact';
import CampaignForm, { emptyCampaign } from '@/components/CampaignForm';
import { Alert, PageTitle, Skeleton } from '@/components/ui';

export default function RequestCampaign() {
  const router = useRouter();
  const qc = useQueryClient();
  const biz = useQuery({ queryKey: ['biz'], queryFn: () => api<{ business: { verificationStatus: string } | null }>('/business/me') });
  const verified = biz.data?.business?.verificationStatus === 'VERIFIED';
  // The API refuses campaign requests from unapproved businesses; this only avoids showing a form that can't be sent.
  useEffect(() => { if (biz.data && !verified) router.replace('/business'); }, [biz.data, verified, router]);
  if (!verified) return <Skeleton className="mx-auto h-96 max-w-2xl" />;
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Request a campaign" sub="Our team reviews every campaign and publishes it for you. Terms can’t be changed once tickets are sold." />
      <div className="mb-5"><Alert>You can’t publish campaigns yourself. After you submit, we’ll review the request and may contact you about changes. Prefer to talk first? Email <a className="font-semibold underline" href={businessMailto('Campaign enquiry')}>{BUSINESS_EMAIL}</a>.</Alert></div>
      <CampaignForm initial={emptyCampaign} submitLabel="Submit for review" onSubmit={async (body) => { await api('/business/campaigns', { body }); await qc.invalidateQueries({ queryKey: ['biz-campaigns'] }); router.push('/business?submitted=1'); }} />
    </div>
  );
}
