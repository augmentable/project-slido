
import { themes, type ThemeId } from '@/lib/themes';

export function ThemePicker({ current, onChange }: { current: ThemeId; onChange: (t: ThemeId) => void }) {
  const swatches: Record<ThemeId, string[]> = {
    nightowl: ['#0f1729', '#1e3a5f', '#f59e0b', '#38bdf8'],
    paper: ['#faf6f1', '#1c1917', '#c2410c', '#a16207'],
    electric: ['#18181b', '#e4e4e7', '#a855f7', '#06b6d4'],
  };

  return (
    <div className="flex items-center gap-2">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium tracking-wide transition-all duration-200 ${
            current === t.id
              ? 'ring-2 ring-[var(--accent)] shadow-sm'
              : 'opacity-60 hover:opacity-100'
          }`}
          style={{ background: swatches[t.id][0], color: swatches[t.id][1] }}
          title={t.description}
        >
          <span className="flex gap-0.5">
            {swatches[t.id].slice(2).map((c, i) => (
              <span key={i} className="w-2 h-2 rounded-full" style={{ background: c }} />
            ))}
          </span>
          {t.name}
        </button>
      ))}
    </div>
  );
}
