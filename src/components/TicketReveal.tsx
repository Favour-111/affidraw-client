'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Ticket } from 'lucide-react';
import { naira } from '@/lib/format';
import { Button, buttonCls, cx } from './ui';

/**
 * Slot-machine style reveal of ticket numbers that the SERVER has already allocated.
 * The animation is presentation only: each reel lands on a number we were given.
 */
type Props = {
  numbers: number[];
  capacity: number;
  campaignTitle: string;
  total: number;
  balance: number | null;
  onClose: () => void;
};

const FILLERS = 26;

function Reel({ final, capacity, index, height, onLanded, instant }: { final: number; capacity: number; index: number; height: number; onLanded: () => void; instant: boolean }) {
  // Random filler numbers then the real one at the end of the strip.
  const strip = useMemo(() => {
    const s: number[] = [];
    for (let i = 0; i < FILLERS; i++) s.push(1 + Math.floor(Math.random() * capacity));
    s.push(final);
    return s;
  }, [final, capacity]);
  const [go, setGo] = useState(instant);
  const [landed, setLanded] = useState(instant);
  const duration = 2100 + index * 650; // reels stop one after another
  const doneRef = useRef(false);

  useEffect(() => {
    if (instant) { onLanded(); return; }
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true)));
    // Safety net in case transitionend never fires (e.g. background tab).
    const t = setTimeout(() => land(), duration + 400);
    return () => { cancelAnimationFrame(r); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function land() {
    if (doneRef.current) return;
    doneRef.current = true;
    setLanded(true);
    onLanded();
  }

  const offset = go ? -(strip.length - 1) * height : 0;
  return (
    <div className={cx('relative overflow-hidden rounded-2xl bg-white shadow-[inset_0_2px_6px_rgb(0_0_0/0.12)] transition-shadow duration-300', landed && 'land ring-4 ring-primary/70')} style={{ height: height * 1.6, width: height * 1.45 }}>
      <div
        className="absolute inset-x-0"
        style={{
          top: height * 0.3,
          transform: `translateY(${offset}px)`,
          transition: instant ? 'none' : `transform ${duration}ms cubic-bezier(0.12, 0.88, 0.22, 1.04), filter ${duration * 0.8}ms ease-in`,
          filter: go && !landed ? 'blur(0.3px)' : 'blur(0)',
        }}
        onTransitionEnd={(e) => e.propertyName === 'transform' && land()}
        aria-hidden
      >
        {strip.map((n, i) => (
          <div key={i} className="tabular flex items-center justify-center font-extrabold tracking-[-0.03em] text-[#10231a]" style={{ height, fontSize: height * 0.46 }}>
            <span className="mr-0.5 text-[0.5em] font-bold text-[#8a968d]">#</span>{n}
          </div>
        ))}
      </div>
      {/* fade top/bottom like a drum, and a centre pay-line */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgb(255_255_255/0.95),rgb(255_255_255/0)_32%,rgb(255_255_255/0)_68%,rgb(255_255_255/0.95))]" />
      <div className="pointer-events-none absolute inset-x-2 border-y border-[#4a943e]/30" style={{ top: height * 0.3, height }} />
      {landed && <CheckCircle2 className="pop absolute right-1.5 top-1.5 h-5 w-5 text-[#4a943e]" aria-hidden />}
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    left: `${4 + Math.random() * 92}%`,
    delay: `${Math.random() * 0.35}s`,
    dx: `${(Math.random() - 0.5) * 120}px`,
    rot: `${360 + Math.random() * 540}deg`,
    color: ['#4a943e', '#e8a317', '#6cc15e', '#3d7e33', '#f2c94c', '#ffffff'][i % 6],
  })), []);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden motion-reduce:hidden" aria-hidden>
      {pieces.map((p, i) => <span key={i} className="confetti" style={{ left: p.left, background: p.color, animationDelay: p.delay, ['--dx' as string]: p.dx, ['--rot' as string]: p.rot }} />)}
    </div>
  );
}

export default function TicketReveal({ numbers, capacity, campaignTitle, total, balance, onClose }: Props) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [landedCount, setLandedCount] = useState(0);
  const [phase, setPhase] = useState<'rolling' | 'done'>('rolling');
  const sorted = useMemo(() => [...numbers].sort((a, b) => a - b), [numbers]);
  const reelH = sorted.length <= 3 ? 64 : 48;

  useEffect(() => {
    if (landedCount >= sorted.length && phase === 'rolling') {
      const t = setTimeout(() => setPhase('done'), reduced ? 150 : 700);
      return () => clearTimeout(t);
    }
  }, [landedCount, sorted.length, phase, reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') (phase === 'rolling' ? setPhase('done') : onClose()); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [phase, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reveal-title">
      <div className="overlay absolute inset-0 bg-[rgb(8_16_11/0.72)] backdrop-blur-sm" aria-hidden />

      {phase === 'rolling' ? (
        <div className="pop relative w-full max-w-md rounded-[28px] bg-[#0f1f14] p-5 text-white shadow-2xl ring-1 ring-white/10">
          <div className="flex items-center justify-center gap-2" aria-hidden>
            {Array.from({ length: 9 }, (_, i) => <span key={i} className={cx('bulb h-1.5 w-1.5 rounded-full', i % 2 ? 'bg-[#e8a317]' : 'bg-[#6cc15e]')} style={{ animationDelay: `${(i % 3) * 0.3}s` }} />)}
          </div>
          <h2 id="reveal-title" className="mt-4 text-center text-heading font-bold text-white">Drawing your ticket number{sorted.length > 1 ? 's' : ''}…</h2>
          <p className="mt-1 text-center text-meta text-white/60">Numbers are assigned by our server — this is just the fun part.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 rounded-2xl bg-black/25 p-4">
            {sorted.map((n, i) => (
              <Reel key={`${n}-${i}`} final={n} capacity={capacity} index={i} height={reelH} instant={reduced} onLanded={() => setLandedCount((c) => c + 1)} />
            ))}
          </div>
          <div className="mt-5 flex justify-center">
            <button onClick={() => setPhase('done')} className="text-meta font-semibold text-white/60 underline-offset-4 hover:text-white hover:underline">Skip animation</button>
          </div>
        </div>
      ) : (
        <div className="pop relative w-full max-w-md overflow-hidden rounded-[28px] bg-surface p-6 text-center shadow-2xl">
          <Confetti />
          <div className="relative">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary"><Ticket className="h-7 w-7" aria-hidden /></span>
            <h2 id="reveal-title" className="mt-4 text-display font-bold">Your tickets are confirmed!</h2>
            <p className="mt-1 text-body text-muted">{campaignTitle}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2" aria-live="polite" aria-label={`Your ticket numbers: ${sorted.join(', ')}`}>
              {sorted.map((n, i) => (
                <span key={n} className="pop tabular rounded-xl bg-primary-soft px-4 py-2 text-display font-extrabold text-primary-text" style={{ animationDelay: `${i * 80}ms` }}>#{n}</span>
              ))}
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-2 text-left">
              <div className="rounded-xl bg-surface-2 px-4 py-3"><dt className="text-micro font-semibold uppercase text-muted">Paid from wallet</dt><dd className="tabular mt-0.5 text-body font-bold text-ink">{naira(total)}</dd></div>
              <div className="rounded-xl bg-surface-2 px-4 py-3"><dt className="text-micro font-semibold uppercase text-muted">New balance</dt><dd className="tabular mt-0.5 text-body font-bold text-ink">{balance === null ? '—' : naira(balance)}</dd></div>
            </dl>
            <p className="mt-4 text-meta text-muted">Good luck! We’ll notify you when the official draw happens.</p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={onClose} autoFocus>Back to draw</Button>
              <Link href="/tickets" className={buttonCls('primary', 'md', true)}>My Tickets</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
