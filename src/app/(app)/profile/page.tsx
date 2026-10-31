'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Bell, Briefcase, ChevronRight, Gift, LayoutDashboard, Lock, LogOut, Receipt, UserCog, KeyRound } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useMe } from '@/lib/hooks';
import { Alert, Button, EmptyState, Field, LinkButton, Sheet, Skeleton, cx, inputCls } from '@/components/ui';

type Tone = 'green' | 'amber' | 'blue' | 'rose' | 'violet' | 'slate';
const TONES: Record<Tone, string> = {
  green: 'bg-primary-soft text-primary-text',
  amber: 'bg-warning-soft text-warning',
  blue: 'bg-[#eaf1fd] text-[#2f5fb3] dark:bg-[#17233a] dark:text-[#8fb4f2]',
  rose: 'bg-danger-soft text-danger',
  violet: 'bg-[#f1ecfb] text-[#6a44b8] dark:bg-[#231b35] dark:text-[#b9a1f0]',
  slate: 'bg-surface-2 text-muted',
};

function Row({ icon: Icon, tone, title, desc, href, onClick, right }: { icon: any; tone: Tone; title: string; desc?: string; href?: string; onClick?: () => void; right?: React.ReactNode }) {
  const inner = (
    <>
      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', TONES[tone])}><Icon className="h-4.5 w-4.5" aria-hidden /></span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-body font-semibold text-ink">{title}</span>
        {desc && <span className="block truncate text-meta text-muted">{desc}</span>}
      </span>
      {right ?? <ChevronRight className="h-4.5 w-4.5 shrink-0 text-subtle" aria-hidden />}
    </>
  );
  const cls = 'flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface-2';
  if (href?.startsWith('mailto:')) return <a href={href} className={cls}>{inner}</a>;
  return href ? <Link href={href} className={cls}>{inner}</Link> : onClick ? <button onClick={onClick} className={cls}>{inner}</button> : <div className={cls}>{inner}</div>;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-micro font-semibold uppercase tracking-[0.08em] text-muted">{title}</h2>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{children}</div>
    </section>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-primary-strong' : 'bg-line-strong')}>
      <span className={cx('absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

export default function Profile() {
  const me = useMe();
  const qc = useQueryClient();
  const router = useRouter();
  const user = me.data?.user;
  const [sheet, setSheet] = useState<'edit' | 'security' | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (body: object) => api('/me/profile', { method: 'PATCH', body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me'] }); setSheet(null); setMsg({ tone: 'success', text: 'Your changes were saved.' }); },
    onError: (e: ApiError) => setFormErr(e.message),
  });
  const changePw = useMutation({
    mutationFn: () => api('/auth/change-password', { body: { newPassword: pw.newPassword, currentPassword: pw.currentPassword || undefined } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me'] }); setPw({ currentPassword: '', newPassword: '' }); setSheet(null); setMsg({ tone: 'success', text: 'Your password was updated.' }); },
    onError: (e: ApiError) => setFormErr(e.details?.newPassword?.[0] ?? e.message),
  });
  const claims = useQuery({ queryKey: ['claims'], queryFn: () => api<{ claims: { id: string; status: string; campaign: { title: string } }[] }>('/me/claims'), enabled: !!user });

  if (me.isLoading) return <Skeleton className="mx-auto h-64 w-full max-w-2xl" />;
  if (!user) return (<><h1 className="sr-only">Profile</h1><EmptyState icon={UserCog} title="Log in to manage your account" action={<LinkButton href="/login?next=/profile">Log in</LinkButton>} /></>);

  async function logout() { await api('/auth/logout', { method: 'POST', body: {} }); qc.clear(); router.replace('/'); router.refresh(); }
  const open = (s: 'edit' | 'security') => { setFormErr(null); setMsg(null); if (s === 'edit') { setName(user!.name); setPhone(user!.phone ?? ''); } setSheet(s); };
  const verified = user.verificationStatus === 'VERIFIED';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="sr-only">Profile</h1>
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-soft text-display font-bold text-primary-text" aria-hidden>{user.name.charAt(0).toUpperCase()}</span>
        <div className="min-w-0">
          <p className="truncate text-heading font-bold text-ink">{user.name}</p>
          <p className="truncate text-label text-muted">{user.email}{user.phone ? ` · ${user.phone}` : ''}</p>
          <span className={cx('mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-meta font-semibold', verified ? 'bg-primary-soft text-primary-text' : 'bg-surface-2 text-muted')}>
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />{verified ? 'Verified account' : 'Not yet verified'}
          </span>
        </div>
      </div>

      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      {claims.data && claims.data.claims.length > 0 && (
        <Group title="Prizes">
          {claims.data.claims.map((c) => <Row key={c.id} icon={Gift} tone="green" title={c.campaign.title} desc={`Claim status: ${c.status.replace(/_/g, ' ').toLowerCase()}`} right={<span />} />)}
        </Group>
      )}

      {user.role !== 'USER' && (
        <Group title="Workspace">
          {user.role === 'ADMIN' && <Row icon={LayoutDashboard} tone="violet" title="Admin dashboard" desc="Campaigns, draws, claims and audit log" href="/admin" />}
          {user.role === 'BUSINESS' && <Row icon={Briefcase} tone="violet" title="Business portal" desc="Submit prizes and track your campaigns" href="/business" />}
        </Group>
      )}

      <Group title="Account">
        <Row icon={UserCog} tone="green" title="Edit profile" desc="Name and phone number" onClick={() => open('edit')} />
        {!user.clerkLinked && <Row icon={Lock} tone="amber" title={user.hasPassword ? 'Security' : 'Set a password'} desc={user.hasPassword ? 'Change your password' : 'You sign in with Google — add a password too'} onClick={() => open('security')} />}
        <Row icon={KeyRound} tone="violet" title="Transaction PIN" desc={user.hasPin ? 'Change the PIN for withdrawals' : 'Create a PIN to enable withdrawals'} href="/pin/create?returnUrl=/profile" />
        <Row icon={Bell} tone="rose" title="Email notifications" desc="Purchase confirmations and results" right={<Switch label="Email notifications" checked={user.emailNotifications} onChange={(v) => save.mutate({ emailNotifications: v })} />} />
        <Row icon={Receipt} tone="blue" title="Transaction history" desc="Payments and refunds" href="/wallet" />
      </Group>


      <Button variant="danger" full onClick={logout}><LogOut className="h-4 w-4" aria-hidden />Log out</Button>

      <Sheet open={sheet === 'edit'} onClose={() => setSheet(null)} title="Edit profile">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setFormErr(null); save.mutate({ name, phone: phone || null }); }}>
          {formErr && <Alert tone="error">{formErr}</Alert>}
          <Field label="Full name" required><input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Phone number"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" /></Field>
          <p className="text-meta text-muted">To change your email address, contact support so we can verify it’s you.</p>
          <Button type="submit" full loading={save.isPending}>Save changes</Button>
        </form>
      </Sheet>
      <Sheet open={sheet === 'security'} onClose={() => setSheet(null)} title={user.hasPassword ? 'Change password' : 'Set a password'}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setFormErr(null); changePw.mutate(); }}>
          {formErr && <Alert tone="error">{formErr}</Alert>}
          {user.hasPassword && <Field label="Current password" required><input autoFocus className={inputCls} type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>}
          <Field label="New password" required hint="At least 10 characters."><input className={inputCls} type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
          <Button type="submit" full loading={changePw.isPending} disabled={(user.hasPassword && !pw.currentPassword) || pw.newPassword.length < 10}>{user.hasPassword ? 'Update password' : 'Set password'}</Button>
        </form>
      </Sheet>
    </div>
  );
}
