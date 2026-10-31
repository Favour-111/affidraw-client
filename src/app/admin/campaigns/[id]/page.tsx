'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import CampaignForm, { CampaignFormValues } from '@/components/CampaignForm';
import { Alert, Button, Card, ErrorState, PageTitle, Skeleton, StatusBadge } from '@/components/ui';
import { ReasonDialog } from '@/components/admin';

const local = (d?: string | null) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

export default function EditCampaign() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-campaign', id], queryFn: () => api<{ campaign: any }>(`/admin/campaigns/${id}`) });
  const [dlg, setDlg] = useState<null | 'reject' | 'request-changes' | 'cancel'>(null);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const act = useMutation({
    mutationFn: ({ action, body }: { action: string; body?: object }) => api(`/admin/campaigns/${id}/${action}`, { body: body ?? {} }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-campaign', id] }); setMsg({ tone: 'success', text: 'Done.' }); },
    onError: (e: ApiError) => setMsg({ tone: 'error', text: e.message }),
  });
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <Skeleton className="h-96 w-full" />;
  const c = q.data.campaign;
  const locked = c.ticketsSold > 0 || !!c.termsLockedAt;
  const s = c.status as string;
  const initial: CampaignFormValues = {
    title: c.title, description: c.description, categoryId: c.categoryId, sponsorName: c.sponsorName, prizeValue: c.prizeValue ? String(c.prizeValue / 100) : '', prizeVerified: c.prizeVerified,
    ticketPrice: String(c.ticketPrice / 100), capacity: String(c.capacity), maxTicketsPerUser: String(c.maxTicketsPerUser), imageUrls: c.images.filter((i: any) => i.mediaType !== 'video').sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((i: any) => i.url), videoUrls: c.images.filter((i: any) => i.mediaType === 'video').map((i: any) => i.url), startsAt: local(c.startsAt),
    eligibilityRules: c.eligibilityRules, drawRules: c.drawRules, refundRules: c.refundRules, deliveryRules: c.deliveryRules, youtubeUrl: c.youtubeUrl ?? '', drawScheduledAt: local(c.drawScheduledAt), featured: c.featured,
  };
  const btn = (label: string, action: string, variant: 'primary' | 'secondary' = 'secondary') => <Button key={action} variant={variant} size="sm" loading={act.isPending && act.variables?.action === action} onClick={() => act.mutate({ action })}>{label}</Button>;

  return (
    <div>
      <PageTitle title={c.title} />
      <Card className="mb-5 space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3"><StatusBadge status={s} /><span className="text-label text-muted">{c.ticketsSold}/{c.capacity} tickets sold{c.sponsor ? ` · ${c.sponsor.businessName} (${c.sponsor.verificationStatus.toLowerCase()})` : ''}</span></div>
        {c.rejectionReason && <Alert tone="warning">Reason on record: {c.rejectionReason}</Alert>}
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <div className="flex flex-wrap gap-2">
          {s === 'PENDING_APPROVAL' && <>{btn('Approve', 'approve', 'primary')}<Button variant="secondary" size="sm" onClick={() => setDlg('request-changes')}>Request changes</Button><Button variant="danger" size="sm" onClick={() => setDlg('reject')}>Reject</Button></>}
          {(s === 'SCHEDULED' || (s === 'DRAFT' && !c.sponsorBusinessId)) && btn('Publish', 'publish', 'primary')}
          {s === 'OPEN' && btn('Pause entries', 'pause')}
          {s === 'PAUSED' && btn('Resume entries', 'resume', 'primary')}
          {!['COMPLETED', 'CANCELLED', 'RESULT_PENDING'].includes(s) && s !== 'DRAFT' && <Button variant="danger" size="sm" onClick={() => setDlg('cancel')}>Cancel &amp; refund</Button>}
          {c.draw && <a href={`/admin/draws/${c.draw.id}`} className="inline-flex h-9 items-center rounded-xl border border-line px-3 text-label font-semibold hover:bg-surface-2">Open draw</a>}
        </div>
      </Card>
      <CampaignForm initial={initial} admin lockTerms={locked} submitLabel="Save changes" onSubmit={async (body) => {
        await api(`/admin/campaigns/${id}`, { method: 'PATCH', body });
        qc.invalidateQueries({ queryKey: ['admin-campaign', id] }); setMsg({ tone: 'success', text: 'Changes saved and recorded in the audit log.' });
      }} />
      {dlg && <ReasonDialog title={dlg === 'cancel' ? 'Cancel campaign and refund all tickets' : dlg === 'reject' ? 'Reject campaign' : 'Request changes'} confirmLabel="Confirm" onClose={() => setDlg(null)} onConfirm={async (reason) => { await act.mutateAsync({ action: dlg, body: { reason } }); }} />}
    </div>
  );
}
