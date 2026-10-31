'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ImagePlus, PlayCircle, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { ACCEPT, uploadMedia } from '@/lib/upload';
import { toKobo } from '@/lib/format';
import { Alert, Button, Field, inputCls, textareaCls } from './ui';

export type CampaignFormValues = {
  title: string; description: string; categoryId: string; sponsorName: string; prizeValue: string; prizeVerified: boolean;
  ticketPrice: string; capacity: string; maxTicketsPerUser: string; imageUrls: string[]; videoUrls: string[]; startsAt: string;
  eligibilityRules: string; drawRules: string; refundRules: string; deliveryRules: string; youtubeUrl: string; drawScheduledAt: string; featured: boolean;
};
export const emptyCampaign: CampaignFormValues = {
  title: '', description: '', categoryId: '', sponsorName: '', prizeValue: '', prizeVerified: false, ticketPrice: '', capacity: '', maxTicketsPerUser: '',
  imageUrls: [], videoUrls: [], startsAt: '', eligibilityRules: '', drawRules: '', refundRules: '', deliveryRules: '', youtubeUrl: '', drawScheduledAt: '', featured: false,
};

/** Shared by the admin editor and the business submission form. `admin` unlocks verification, broadcast and featuring. */
export default function CampaignForm({ initial, admin, lockTerms, submitLabel, onSubmit }: { initial: CampaignFormValues; admin?: boolean; lockTerms?: boolean; submitLabel: string; onSubmit: (body: Record<string, unknown>) => Promise<void> }) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState<{ name: string; pct: number }[]>([]);
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api<{ categories: { id: string; name: string }[] }>('/categories') });
  const set = <K extends keyof CampaignFormValues>(k: K, val: CampaignFormValues[K]) => setV((s) => ({ ...s, [k]: val }));
  const fe = (k: string) => err?.details?.[k]?.[0];

  async function addMedia(files: FileList | null) {
    if (!files) return;
    setErr(null);
    for (const f of Array.from(files)) {
      const row = { name: f.name, pct: 0 };
      setUploads((u) => [...u, row]);
      try {
        const r = await uploadMedia(f, (pct) => setUploads((u) => u.map((x) => (x === row ? Object.assign(row, { pct }) : x)).slice()));
        setV((s) => (r.kind === 'video' ? { ...s, videoUrls: [...s.videoUrls, r.url].slice(0, 2) } : { ...s, imageUrls: [...s.imageUrls, r.url].slice(0, 8) }));
      } catch (e) {
        setErr(e as ApiError);
      } finally {
        setUploads((u) => u.filter((x) => x !== row));
      }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const opt = (s: string) => (s.trim() ? s.trim() : undefined);
    const body: Record<string, unknown> = {
      title: v.title, description: v.description, categoryId: v.categoryId, sponsorName: v.sponsorName || 'Sponsor',
      prizeValue: v.prizeValue ? toKobo(v.prizeValue) : null, ticketPrice: toKobo(v.ticketPrice), capacity: Number(v.capacity),
      maxTicketsPerUser: Number(v.maxTicketsPerUser), imageUrls: v.imageUrls, videoUrls: v.videoUrls, startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : null,
      eligibilityRules: opt(v.eligibilityRules), drawRules: opt(v.drawRules), refundRules: opt(v.refundRules), deliveryRules: opt(v.deliveryRules),
    };
    if (admin) Object.assign(body, { prizeVerified: v.prizeVerified, featured: v.featured, youtubeUrl: v.youtubeUrl || null, drawScheduledAt: v.drawScheduledAt ? new Date(v.drawScheduledAt).toISOString() : null });
    try { await onSubmit(body); } catch (e) { setErr(e as ApiError); } finally { setBusy(false); }
  }

  const sec = 'space-y-4 rounded-2xl border border-line bg-surface p-4';
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {err && <Alert tone="error">{err.message}{err.details && <ul className="mt-1 list-disc pl-5">{Object.entries(err.details).map(([k, m]) => <li key={k}>{k}: {m[0]}</li>)}</ul>}</Alert>}
      {lockTerms && <Alert tone="warning">Ticket sales have started. Price, capacity, limits, rules and prize identity are locked and cannot be changed.</Alert>}

      <section className={sec}>
        <h2 className="font-bold">Prize</h2>
        <Field label="Campaign title" error={fe('title')}><input className={inputCls} value={v.title} onChange={(e) => set('title', e.target.value)} disabled={lockTerms} /></Field>
        <Field label="Description" error={fe('description')}><textarea className={textareaCls} rows={4} value={v.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" error={fe('categoryId')}>
            <select className={inputCls} value={v.categoryId} onChange={(e) => set('categoryId', e.target.value)} disabled={lockTerms}><option value="">Select…</option>{cats.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </Field>
          {admin && <Field label="Sponsor name" error={fe('sponsorName')}><input className={inputCls} value={v.sponsorName} onChange={(e) => set('sponsorName', e.target.value)} disabled={lockTerms} /></Field>}
          <Field label="Prize value (₦)" hint="Shown publicly only once verified." error={fe('prizeValue')}><input className={inputCls} inputMode="decimal" value={v.prizeValue} onChange={(e) => set('prizeValue', e.target.value)} disabled={lockTerms} /></Field>
        </div>
        <div>
          <p className="mb-1.5 text-label font-semibold text-ink">Prize photos &amp; video</p>
          <div className="flex flex-wrap gap-2">
            {v.imageUrls.map((u, i) => (
              <div key={u} className="relative h-20 w-20 overflow-hidden rounded-xl border border-line"><img src={u} alt={`Prize photo ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => set('imageUrls', v.imageUrls.filter((x) => x !== u))} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"><X className="h-3.5 w-3.5" /></button></div>
            ))}
            {v.videoUrls.map((u, i) => (
              <div key={u} className="relative h-20 w-20 overflow-hidden rounded-xl border border-line bg-black"><video src={u} muted playsInline preload="metadata" className="h-full w-full object-cover" aria-label={`Prize video ${i + 1}`} />
                <PlayCircle className="pointer-events-none absolute inset-0 m-auto h-7 w-7 text-white/90" aria-hidden />
                <button type="button" aria-label="Remove video" onClick={() => set('videoUrls', v.videoUrls.filter((x) => x !== u))} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"><X className="h-3.5 w-3.5" /></button></div>
            ))}
            {uploads.map((u, i) => (
              <div key={i} className="flex h-20 w-20 flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2" role="status" aria-label={`Uploading ${u.name}, ${u.pct}%`}>
                <span className="tabular text-meta font-semibold text-ink">{u.pct}%</span>
                <span className="h-1 w-full overflow-hidden rounded-full bg-surface-3"><span className="block h-full bg-primary transition-[width]" style={{ width: `${u.pct}%` }} /></span>
              </div>
            ))}
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-strong text-meta text-muted hover:bg-surface-2 focus-within:outline focus-within:outline-2 focus-within:outline-primary">
              <ImagePlus className="h-5 w-5" aria-hidden />Add
              <input type="file" accept={ACCEPT} multiple className="sr-only" onChange={(e) => { addMedia(e.target.files); e.target.value = ''; }} />
            </label>
          </div>
          <p className="mt-1.5 text-meta text-muted">Up to 8 photos (JPEG, PNG or WebP, 5 MB each) and 2 videos (MP4, WebM or MOV, 100 MB each). The first photo is the cover.</p>
        </div>
      </section>

      <section className={sec}>
        <h2 className="font-bold">Tickets</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Ticket price (₦)" error={fe('ticketPrice')}><input className={inputCls} inputMode="decimal" value={v.ticketPrice} onChange={(e) => set('ticketPrice', e.target.value)} disabled={lockTerms} /></Field>
          <Field label="Total tickets" error={fe('capacity')}><input className={inputCls} inputMode="numeric" value={v.capacity} onChange={(e) => set('capacity', e.target.value)} disabled={lockTerms} /></Field>
          <Field label="Max per person" error={fe('maxTicketsPerUser')}><input className={inputCls} inputMode="numeric" value={v.maxTicketsPerUser} onChange={(e) => set('maxTicketsPerUser', e.target.value)} disabled={lockTerms} /></Field>
        </div>
        <Field label="Opens at (optional)"><input className={inputCls} type="datetime-local" value={v.startsAt} onChange={(e) => set('startsAt', e.target.value)} /></Field>
      </section>

      <section className={sec}>
        <h2 className="font-bold">Rules shown to participants</h2>
        <p className="text-meta text-muted">Leave blank to use the standard wording.</p>
        {([['eligibilityRules', 'Eligibility'], ['drawRules', 'How the draw works'], ['refundRules', 'Refunds & cancellation'], ['deliveryRules', 'Winner verification & delivery']] as const).map(([k, l]) => (
          <Field key={k} label={l} error={fe(k)}><textarea className={textareaCls} rows={2} value={v[k]} onChange={(e) => set(k, e.target.value)} disabled={lockTerms} /></Field>
        ))}
      </section>

      {admin && (
        <section className={sec}>
          <h2 className="font-bold">Draw & visibility</h2>
          <Field label="YouTube Live URL" hint="https://youtube.com/watch?v=… or https://youtu.be/…" error={fe('youtubeUrl')}><input className={inputCls} value={v.youtubeUrl} onChange={(e) => set('youtubeUrl', e.target.value)} /></Field>
          <Field label="Scheduled broadcast time"><input className={inputCls} type="datetime-local" value={v.drawScheduledAt} onChange={(e) => set('drawScheduledAt', e.target.value)} /></Field>
          <label className="flex items-center gap-2.5 text-label"><input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={v.prizeVerified} onChange={(e) => set('prizeVerified', e.target.checked)} /> Prize value has been verified (shows publicly)</label>
          <label className="flex items-center gap-2.5 text-label"><input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={v.featured} onChange={(e) => set('featured', e.target.checked)} /> Feature on Market</label>
        </section>
      )}
      <Button type="submit" size="lg" loading={busy}>{submitLabel}</Button>
    </form>
  );
}
