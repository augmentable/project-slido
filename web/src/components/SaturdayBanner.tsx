'use client';

import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const DISMISS_KEY = 'slido_saturday_dismissed';

function todayKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

type SaturdayBannerProps = { code: string; enabled: boolean };

export function SaturdayBanner({ code, enabled }: SaturdayBannerProps): JSX.Element | null {
  // Start hidden so SSR and the first paint never emit banner markup; the
  // media query is only known on the client, inside an effect.
  const [isDesktop, setIsDesktop] = useState(false);
  const [dismissedToday, setDismissedToday] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    setIsDesktop(mql.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    try {
      setDismissedToday(window.localStorage.getItem(DISMISS_KEY) === todayKey());
    } catch {
      setDismissedToday(false);
    }
  }, []);

  if (!enabled || new Date().getDay() !== 6 || !isDesktop || dismissedToday) {
    return null;
  }

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, todayKey());
    } catch {
      // Storage may be unavailable; still hide for this render.
    }
    setDismissedToday(true);
  };

  return (
    <div
      data-testid="saturday-banner"
      className="themed-card flex flex-wrap items-center justify-between gap-3 px-5 py-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>It's Saturday.</p>
        <Link href={`/session/${code}/present`} className="themed-btn text-sm" style={{ padding: '6px 14px' }}>
          Go to presentation mode
        </Link>
      </div>
      <button
        type="button"
        aria-label="Dismiss Saturday banner"
        onClick={dismiss}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none transition-colors"
        style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--border)' }}
      >
        &times;
      </button>
    </div>
  );
}
