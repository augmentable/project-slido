'use client';

import type { JSX } from 'react';
import { themes, type ThemeId } from '@/lib/themes';
import { useTextScale, useTheme } from '@/components/ThemeProvider';

export function DisplayControls({ compact: _compact, showTheme = true, align = 'left' }: { compact?: boolean; showTheme?: boolean; align?: 'left' | 'right' }): JSX.Element {
  const { theme, setTheme } = useTheme();
  const { scale, setScale } = useTextScale();
  const buttonStyle = { width: 36, height: 32, fontSize: 12, lineHeight: '32px', padding: 0, flexShrink: 0 } as const;
  const right = align === 'right';
  // 36 (A−) + 4 gap + 36 (A+) + 4 gap + 56 (Reset), all px so the group
  // keeps identical screen positions as the root font size scales.
  const buttonGroupWidth = 36 + 4 + 36 + 4 + 56;

  return (
    <div className={`flex flex-nowrap items-center gap-1.5 text-xs${right ? ' ml-auto shrink-0' : ''}`}>
      {showTheme && <>
        <label className="sr-only" htmlFor="display-theme">Theme</label>
        <select id="display-theme" value={theme} onChange={(event) => setTheme(event.target.value as ThemeId)} className="rounded-lg outline-none" style={{ background: 'var(--bg-raised)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 12, minWidth: 120 }}>
          {themes.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </>}
      <div className={`flex flex-nowrap items-center gap-1${right ? ' ml-auto' : ''}`} style={right ? { width: buttonGroupWidth, gap: 4 } : undefined}>
        <button type="button" onClick={() => setScale(scale - 0.1)} disabled={scale <= 0.85} className="rounded-lg border border-[var(--border)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40" style={{ ...buttonStyle, background: 'var(--bg-raised)', color: 'var(--accent)' }} aria-label="Decrease text size" title="Decrease text size">A−</button>
        <button type="button" onClick={() => setScale(scale + 0.1)} disabled={scale >= 1.6} className="rounded-lg border border-[var(--border)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40" style={{ ...buttonStyle, background: 'var(--bg-raised)', color: 'var(--accent)' }} aria-label="Increase text size" title="Increase text size">A+</button>
        <button type="button" onClick={() => setScale(1)} className="rounded-lg border border-[var(--border)] transition-opacity" style={{ ...buttonStyle, width: 56, background: 'var(--bg-raised)', color: 'var(--text-muted)' }} aria-label="Reset text size" title="Reset text size">Reset</button>
      </div>
    </div>
  );
}
