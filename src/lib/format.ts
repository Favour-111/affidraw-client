/** Amounts arrive as integer kobo; never use floating point for money math. */
export const naira = (minor: number | bigint | null | undefined) => {
  if (minor === null || minor === undefined) return '—';
  const n = Number(minor);
  const whole = Math.trunc(n / 100);
  const kobo = Math.abs(n % 100);
  return `₦${whole.toLocaleString('en-NG')}${kobo ? `.${String(kobo).padStart(2, '0')}` : ''}`;
};
export const toKobo = (nairaStr: string) => Math.round(Number(nairaStr.replace(/,/g, '')) * 100);
export const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
export const pct = (sold: number, cap: number) => {
  if (!cap) return 0;
  const p = Math.floor((sold / cap) * 100);
  return sold > 0 && p === 0 ? 1 : Math.min(100, p); // never show 0% once a ticket is sold
};

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', PENDING_APPROVAL: 'Pending approval', CHANGES_REQUESTED: 'Changes requested', REJECTED: 'Rejected',
  SCHEDULED: 'Upcoming', OPEN: 'Open', PAUSED: 'Paused', SOLD_OUT: 'Sold out', AWAITING_DRAW: 'Awaiting draw',
  DRAW_IN_PROGRESS: 'Draw in progress', RESULT_PENDING: 'Result pending', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

export function youtubeEmbed(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v');
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

/** Compact naira for small labels: ₦950, ₦54.8k, ₦1.4M. */
export const nairaCompact = (minor: number) => {
  const n = Number(minor) / 100;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
};
export const shortDate = (d: string | Date) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
