import type { CSSProperties, JSX, ReactNode } from 'react';

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"'`]+)/gi;
const TRAILING_PUNCT = /[),.;:!?]+$/;

function toSafeHref(raw: string): string | null {
  const href = raw.startsWith('www.') ? `https://${raw}` : raw;
  try {
    const url = new URL(href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

function splitMatch(raw: string): { core: string; trail: string } {
  const trail = raw.match(TRAILING_PUNCT)?.[0] ?? '';
  return { core: trail ? raw.slice(0, -trail.length) : raw, trail };
}

export function linkifyText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  const re = new RegExp(URL_RE);
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const { core, trail } = splitMatch(match[0]);
    const href = toSafeHref(core);
    if (href) {
      nodes.push(
        <a
          key={`url-${key++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline break-all"
          style={{ color: 'var(--accent)' }}
        >
          {core}
        </a>,
      );
      if (trail) nodes.push(trail);
    } else {
      nodes.push(match[0]);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function LinkifiedText({
  text,
  className,
  style,
  as: Tag = 'p',
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
  as?: 'p' | 'span';
}): JSX.Element {
  return <Tag className={className} style={style}>{linkifyText(text)}</Tag>;
}
