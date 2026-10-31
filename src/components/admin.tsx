'use client';
import { useState } from 'react';
import { Button, Card, Field, Sheet, textareaCls } from './ui';

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-label">
        <thead className="border-b border-line bg-surface-2/60">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 text-micro font-semibold uppercase tracking-[0.08em] text-muted">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </Card>
  );
}
export const Td = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => <td className={`px-4 py-3.5 align-middle text-ink ${className}`}>{children}</td>;

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-label text-muted">
      <span className="tabular">{total.toLocaleString()} total</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <span className="tabular px-1">Page {page} of {pages}</span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

/** Asks for a written reason before a consequential action (reject, cancel, re-run). */
export function ReasonDialog({ title, confirmLabel, minLength = 10, onConfirm, onClose }: { title: string; confirmLabel: string; minLength?: number; onConfirm: (reason: string) => Promise<void>; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <Sheet open onClose={onClose} title={title}>
      <Field label="Reason" required hint="Recorded permanently in the audit log." error={err}>
        <textarea autoFocus className={textareaCls} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="danger" loading={busy} onClick={async () => {
          if (reason.trim().length < minLength) return setErr(`Please write at least ${minLength} characters.`);
          setBusy(true);
          try { await onConfirm(reason.trim()); onClose(); } catch (e) { setErr((e as Error).message); setBusy(false); }
        }}>{confirmLabel}</Button>
      </div>
    </Sheet>
  );
}
