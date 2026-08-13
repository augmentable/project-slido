'use client';

import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import * as QRCode from 'qrcode';

type RoomCodeProps = {
  code: string;
  size?: 'md' | 'xl';
  live?: boolean;
  layout?: 'row' | 'stack';
  /** Show a toggle that hides the QR image once everyone has scanned it. */
  collapsible?: boolean;
  /** Fires on mount and on every toggle so a parent can reclaim the space. */
  onCollapsedChange?: (collapsed: boolean) => void;
};

function storageKey(code: string): string {
  return `slido_qr_collapsed_${code}`;
}

export function RoomCode({ code, size = 'md', live, layout = 'row', collapsible = false, onCollapsedChange }: RoomCodeProps): JSX.Element {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  // Start expanded so server and first client render agree; the stored choice is
  // applied in an effect right after mount.
  const [collapsed, setCollapsed] = useState(false);

  const qrSize = size === 'xl' && layout === 'stack' ? 360 : size === 'xl' ? 260 : 96;
  const stacked = layout === 'stack';
  const showQr = !collapsible || !collapsed;
  // Collapsed stacked rail is 200px with padding; text-5xl + tracking overflows both edges.
  const codeTextSize = !showQr && stacked
    ? 'text-2xl'
    : size === 'xl' && stacked ? 'text-3xl lg:text-5xl' : size === 'xl' ? 'text-5xl lg:text-7xl' : 'text-3xl';
  const codeTracking = !showQr && stacked ? 'tracking-[0.04em]' : 'tracking-[0.12em]';

  useEffect(() => {
    if (!collapsible) return;
    const stored = window.localStorage.getItem(storageKey(code)) === '1';
    setCollapsed(stored);
    onCollapsedChange?.(stored);
    // onCollapsedChange is intentionally excluded: parents pass inline closures,
    // and re-running this would clobber a toggle the user just made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsible, code]);

  useEffect(() => {
    // No QR work at all while collapsed - nothing to render it into.
    if (!showQr) return;
    let active = true;
    setQrDataUrl(null);
    QRCode.toDataURL(`${window.location.origin}/session/${code}`, { margin: 1, width: qrSize, color: { dark: '#000000', light: '#ffffff' } })
      .then((dataUrl) => { if (active) setQrDataUrl(dataUrl); })
      .catch(() => { if (active) setQrDataUrl(null); });
    return () => { active = false; };
  }, [code, qrSize, showQr]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(storageKey(code), next ? '1' : '0');
    onCollapsedChange?.(next);
  };

  return (
    <div className={`inline-flex ${stacked ? 'flex-col items-center gap-4' : 'items-center gap-4'} rounded-xl`} style={{ color: 'var(--text)' }}>
      <div className={`${stacked ? 'order-2 text-center' : 'min-w-0'}`}>
        <div className="flex items-center justify-center gap-2 text-xs font-semibold tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
          <span>ROOM CODE</span>
          {live !== undefined && <span className="h-2 w-2 rounded-full" style={{ background: live ? 'var(--success)' : 'var(--text-faint)' }} aria-label={live ? 'Live connection' : 'Connection inactive'} title={live ? 'Live connection' : 'Connection inactive'} />}
        </div>
        <div className={`${codeTextSize} font-mono font-bold leading-none ${codeTracking}`} style={{ color: 'var(--text-strong)' }}>{code}</div>
        {collapsible && (
          <button
            type="button"
            onClick={toggle}
            data-testid="qr-toggle"
            aria-expanded={showQr}
            aria-label={showQr ? 'Hide QR code' : 'Show QR code'}
            title={showQr ? 'Hide QR code' : 'Show QR code'}
            className="mt-2 min-h-11 lg:min-h-0 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '8px 14px' }}
          >
            {showQr ? 'Hide QR' : 'Show QR'}
          </button>
        )}
      </div>
      {/* In row layout the slot keeps its box while hidden, so toggling the QR
          never reflows the header. Stacked rails reclaim the space instead. */}
      {(showQr || !stacked) && (
        <div
          className={`${stacked ? 'order-1' : ''} rounded-xl ${showQr ? 'bg-white' : ''} ${size === 'xl' && stacked ? 'p-4' : 'p-2'}`}
          aria-label={showQr ? `QR code for room ${code}` : undefined}
          aria-hidden={showQr ? undefined : true}
          style={showQr ? undefined : { visibility: 'hidden' }}
        >
          <div
            className={`bg-white ${size === 'xl' && stacked ? 'h-[180px] w-[180px] lg:h-[360px] lg:w-[360px]' : ''}`}
            style={size === 'xl' && stacked ? undefined : { width: qrSize, height: qrSize }}
          >
            {showQr && qrDataUrl ? <img src={qrDataUrl} alt={`QR code for room ${code}`} width={qrSize} height={qrSize} className="block h-full w-full" /> : <div className="h-full w-full" aria-hidden="true" />}
          </div>
        </div>
      )}
    </div>
  );
}