'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { fmtDate, youtubeEmbed } from '@/lib/format';
import { Alert, Button, Card, ErrorState, Field, PageTitle, Skeleton, inputCls } from '@/components/ui';
import { ReasonDialog } from '@/components/admin';

export default function DrawDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-draw', id], queryFn: () => api<{ draw: any }>(`/admin/draws/${id}`) });
  const [yt, setYt] = useState<string | null>(null);
  const [at, setAt] = useState<string | null>(null);
  const [rerun, setRerun] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const run = useMutation({
    mutationFn: ({ action, body }: { action: string; body?: object }) => api(`/admin/draws/${id}/${action}`, { body: body ?? {} }),
    onSuccess: (_d, v) => { setMsg({ tone: 'success', text: `${v.action.replace('-', ' ')} completed.` }); qc.invalidateQueries({ queryKey: ['admin-draw', id] }); },
    onError: (e: ApiError) => setMsg({ tone: 'error', text: e.message }),
  });
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  if (!q.data) return <Skeleton className="h-96 w-full" />;
  const d = q.data.draw;
  const c = d.campaign;
  const execs: any[] = d.executions;
  const active = [...execs].reverse().find((e) => !e.supersededAt);
  const st: string = d.status;
  const prepared = st !== 'AWAITING';
  const executed = st === 'EXECUTED' || st === 'PUBLISHED';
  const published = st === 'PUBLISHED';
  const youtube = yt ?? c.youtubeUrl ?? '';
  const when = at ?? (d.scheduledAt ? new Date(new Date(d.scheduledAt).getTime() - new Date(d.scheduledAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
  const busy = (a: string) => run.isPending && run.variables?.action === a;

  const steps: [string, boolean][] = [['Sold out', c.ticketsSold === c.capacity], ['Pool frozen', prepared], ['Draw executed', executed], ['Result published', published]];

  return (
    <div className="space-y-4">
      <PageTitle title={c.title} sub={`Draw status: ${st.toLowerCase()} · ${c.ticketsSold}/${c.capacity} tickets`} />
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Draw progress">
        {steps.map(([l, done]) => <li key={l} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-label font-medium ${done ? 'border-primary-soft-border bg-primary-soft text-primary-text' : 'border-line text-muted'}`}>{done ? <CheckCircle2 className="h-4 w-4" aria-label="Done" /> : <Circle className="h-4 w-4" aria-label="Not done" />}{l}</li>)}
      </ol>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <Card className="space-y-4 p-4">
        <h2 className="font-bold">1 · Prepare broadcast &amp; freeze the pool</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="YouTube Live URL" hint="Must be an https youtube.com / youtu.be link."><input className={inputCls} value={youtube} onChange={(e) => setYt(e.target.value)} disabled={executed} /></Field>
          <Field label="Scheduled time"><input className={inputCls} type="datetime-local" value={when} onChange={(e) => setAt(e.target.value)} disabled={executed} /></Field>
        </div>
        {youtubeEmbed(c.youtubeUrl) && <div className="aspect-video max-w-lg overflow-hidden rounded-xl bg-black"><iframe className="h-full w-full" src={youtubeEmbed(c.youtubeUrl)!} title="Broadcast preview" allowFullScreen /></div>}
        {!executed && <Button loading={busy('prepare')} onClick={() => run.mutate({ action: 'prepare', body: { youtubeUrl: youtube || null, scheduledAt: when ? new Date(when).toISOString() : null } })}>{prepared ? 'Update broadcast details' : 'Freeze ticket pool & prepare'}</Button>}
        {prepared && (
          <dl className="space-y-1 break-all rounded-xl bg-surface-2 p-3 text-meta">
            <div><dt className="inline font-semibold">Pool commitment (SHA-256): </dt><dd className="inline font-mono">{d.poolCommitment}</dd></div>
            <div><dt className="inline font-semibold">Seed commitment (SHA-256): </dt><dd className="inline font-mono">{d.seedCommitment}</dd></div>
            <div><dt className="inline font-semibold">Pool size / frozen: </dt><dd className="inline">{d.poolSize} · {fmtDate(d.poolFrozenAt)}</dd></div>
          </dl>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-bold">2 · Go live &amp; execute</h2>
        <p className="text-label text-muted">The winner is computed by the platform from the frozen pool, the committed seed{' '}and an optional public randomness beacon. You cannot type in a winning number.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={st !== 'PREPARED' || !!d.startedAt} loading={busy('start')} onClick={() => run.mutate({ action: 'start' })}>Mark draw as live</Button>
          <Button disabled={st !== 'PREPARED'} loading={busy('execute')} onClick={() => run.mutate({ action: 'execute' })}>Execute draw</Button>
        </div>
        {execs.length > 0 && (
          <ul className="space-y-1.5 text-label">
            {execs.map((e) => <li key={e.id} className={e.supersededAt ? 'text-muted line-through' : 'font-semibold'}>Run #{e.seq}: ticket <span className="tabular-nums">#{e.selectedTicketNumber}</span>{e.supersededAt && <span className="ml-2 no-underline">— superseded: {e.supersededReason}</span>}</li>)}
          </ul>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-bold">3 · Review &amp; publish</h2>
        {published ? (
          <Alert tone="success">Published {fmtDate(d.result.publishedAt)}. Winning ticket <strong>#{d.result.winningTicketNumber}</strong>. The result is permanent and cannot be altered.</Alert>
        ) : (
          <>
            <p className="text-label text-muted">{active ? <>Active result: ticket <strong className="text-fg">#{active.selectedTicketNumber}</strong>. Publishing is final, idempotent and notifies the winner.</> : 'Execute the draw first.'}</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={st !== 'EXECUTED'} loading={busy('publish-result')} onClick={() => confirm(`Publish ticket #${active?.selectedTicketNumber} as the official winner? This cannot be undone.`) && run.mutate({ action: 'publish-result' })}>Publish official result</Button>
              <Button variant="danger" disabled={st !== 'EXECUTED'} onClick={() => setRerun(true)}>Re-run (documented exception)</Button>
            </div>
          </>
        )}
      </Card>
      {rerun && <ReasonDialog title="Re-run the draw" minLength={20} confirmLabel="Re-run draw" onClose={() => setRerun(false)} onConfirm={async (reason) => { await run.mutateAsync({ action: 'rerun', body: { reason } }); }} />}
    </div>
  );
}
