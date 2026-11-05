'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Campaign } from '@/lib/types';
import { FeaturedCampaign, FeaturedCompact } from './CampaignCard';
import { cx } from './ui';

const INTERVAL_MS = 10_000;
const SWIPE_PX = 40;

/**
 * Featured campaigns as an auto-advancing carousel (every 10s).
 * Pauses on hover, keyboard focus, touch, hidden tab and prefers-reduced-motion.
 * A single campaign renders as a plain card with no controls.
 */
export default function FeaturedCarousel({ items }: { items: Campaign[] }) {
  const n = items.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touchX = useRef<number | null>(null);
  const swiped = useRef(false);

  // Keep the index valid when the list shrinks after a refetch.
  useEffect(() => { if (index >= n) setIndex(0); }, [n, index]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const go = useCallback((i: number) => setIndex(((i % n) + n) % n), [n]);

  // Restarts whenever the slide changes, so manual navigation gets a full 10s too.
  useEffect(() => {
    if (n < 2 || paused || reduced) return;
    const t = setTimeout(() => { if (!document.hidden) go(index + 1); }, INTERVAL_MS);
    return () => clearTimeout(t);
  }, [index, n, paused, reduced, go]);

  if (n === 0) return null;
  if (n === 1) return <Slide c={items[0]} />;

  return (
    <section
      aria-roledescription="carousel" aria-label="Featured draws"
      className="relative"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') go(index - 1); if (e.key === 'ArrowRight') go(index + 1); }}
    >
      <div
        className="overflow-hidden rounded-[22px] md:rounded-2xl"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; swiped.current = false; setPaused(true); }}
        onTouchEnd={(e) => {
          const start = touchX.current; touchX.current = null; setPaused(false);
          if (start == null) return;
          const dx = e.changedTouches[0].clientX - start;
          if (Math.abs(dx) > SWIPE_PX) { swiped.current = true; go(index + (dx < 0 ? 1 : -1)); }
        }}
        // A swipe shouldn't also count as a tap on the card link.
        onClickCapture={(e) => { if (swiped.current) { e.preventDefault(); e.stopPropagation(); swiped.current = false; } }}
      >
        <div className={cx('flex', !reduced && 'transition-transform duration-500 ease-out')} style={{ transform: `translateX(-${index * 100}%)` }}>
          {items.map((c, i) => (
            <div key={c.id} className="w-full shrink-0 px-px" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${n}`} aria-hidden={i !== index} inert={i !== index}>
              <Slide c={c} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <Arrow side="left" onClick={() => go(index - 1)} />
        <div className="flex gap-1">
          {items.map((c, i) => (
            <button key={c.id} onClick={() => go(i)} aria-label={`Show featured draw ${i + 1}: ${c.title}`} aria-current={i === index}
              className="flex h-6 items-center px-0.5">
              <span className={cx('block h-1.5 rounded-full transition-all duration-300', i === index ? 'w-5 bg-primary' : 'w-1.5 bg-line-strong hover:bg-muted')} />
            </button>
          ))}
        </div>
        <Arrow side="right" onClick={() => go(index + 1)} />
      </div>
    </section>
  );
}

function Slide({ c }: { c: Campaign }) {
  return (
    <>
      <div className="md:hidden"><FeaturedCompact c={c} /></div>
      <div className="hidden md:block"><FeaturedCampaign c={c} /></div>
    </>
  );
}

function Arrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button onClick={onClick} aria-label={side === 'left' ? 'Previous featured draw' : 'Next featured draw'}
      className="hidden h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-ink md:flex">
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
