'use client';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import CampaignForm, { emptyCampaign } from '@/components/CampaignForm';
import { PageTitle } from '@/components/ui';

export default function SubmitCampaign() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Submit a campaign" sub="Our team reviews every campaign before it is published. Terms can’t be changed once tickets are sold." />
      <CampaignForm initial={emptyCampaign} submitLabel="Submit for approval" onSubmit={async (body) => { await api('/business/campaigns', { body }); router.push('/business'); }} />
    </div>
  );
}
