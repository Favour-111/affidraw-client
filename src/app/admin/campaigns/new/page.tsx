'use client';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import CampaignForm, { emptyCampaign } from '@/components/CampaignForm';
import { PageTitle } from '@/components/ui';

export default function NewCampaign() {
  const router = useRouter();
  return (
    <div>
      <PageTitle title="New campaign" sub="Saved as a draft. Publish it from the campaign page when ready." />
      <CampaignForm initial={emptyCampaign} admin submitLabel="Create draft" onSubmit={async (body) => {
        const r = await api<{ campaign: { id: string } }>('/admin/campaigns', { body });
        router.push(`/admin/campaigns/${r.campaign.id}`);
      }} />
    </div>
  );
}
