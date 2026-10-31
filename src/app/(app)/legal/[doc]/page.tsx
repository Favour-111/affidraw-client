import { notFound } from 'next/navigation';

const DOCS: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: 'Terms and conditions',
    body: [
      'DRAFT — this text is a placeholder and must be reviewed by qualified Nigerian counsel before launch.',
      'Affidraw lists prize campaigns supplied by sponsors. Each campaign publishes its ticket price, total tickets, per-person limit, eligibility, draw procedure, refund and delivery rules before you pay.',
      'Tickets are issued only after payment is verified by our payment provider. Ticket numbers are assigned by the platform and cannot be chosen or transferred.',
      'A campaign’s ticket price and rules cannot be changed after sales begin. If a campaign is cancelled, every valid ticket is refunded in full.',
      'The winner is selected by a documented, publicly verifiable procedure and confirmed by an authorised administrator before publication.',
    ],
  },
  privacy: {
    title: 'Privacy policy',
    body: [
      'DRAFT — placeholder pending legal review (including NDPA 2023 compliance).',
      'We collect the minimum data needed to run draws: your name, email, optional phone, ticket and payment records. We never store card details; payments are handled by our provider.',
      'Winners’ identities are not published without their consent. Sponsors only see aggregate sales figures, never purchaser details.',
      'Financial and audit records are retained as required by law. You can request access to or correction of your data through support.',
    ],
  },
  responsible: {
    title: 'Responsible participation',
    body: [
      'DRAFT — placeholder pending legal review.',
      'Only spend what you can afford to lose. Entering a draw is never a way to make money, and winning is never guaranteed.',
      'You must be 18 or older. Per-campaign ticket limits exist to keep participation modest.',
      'If participation is causing you or someone you know difficulty, please stop and seek support from a qualified service.',
    ],
  },
};

export default async function Legal({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = DOCS[doc];
  if (!d) notFound();
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-title font-bold">{d.title}</h1>
      <p className="mt-4 rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-label font-medium text-warning">{d.body[0]}</p>
      <div className="mt-6 space-y-4">{d.body.slice(1).map((p, i) => <p key={i} className="text-body text-fg">{p}</p>)}</div>
    </article>
  );
}
