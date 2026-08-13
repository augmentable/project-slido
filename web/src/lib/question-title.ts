export const MAX_TITLE_WORDS = 10;
export const MAX_TITLE_CHARS = 80;

export function normalizeQuestionTitle(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function clampQuestionTitle(raw: string): string {
  if (typeof raw !== 'string') return '';

  let title = normalizeQuestionTitle(raw);
  if (!title) return '';

  const wrappingQuotes: [string, string][] = [
    ['"', '"'],
    ["'", "'"],
    ['“', '”'],
    ['‘', '’'],
    ['`', '`'],
  ];
  for (const [opening, closing] of wrappingQuotes) {
    if (title.startsWith(opening) && title.endsWith(closing) && title.length >= opening.length + closing.length) {
      title = title.slice(opening.length, -closing.length).trim();
      break;
    }
  }

  title = title.replace(/^Title:\s*/i, '').replace(/[.:]+$/, '').trim();
  title = normalizeQuestionTitle(title);
  if (!title || !/[A-Za-z0-9]/.test(title)) return '';

  const words = title.split(' ').slice(0, MAX_TITLE_WORDS);
  let clamped = '';
  for (const word of words) {
    const candidate = clamped ? `${clamped} ${word}` : word;
    if (candidate.length > MAX_TITLE_CHARS) break;
    clamped = candidate;
  }

  if (!clamped && words[0]) clamped = words[0].slice(0, MAX_TITLE_CHARS).trim();
  return /[A-Za-z0-9]/.test(clamped) ? clamped : '';
}

export function countTitleWords(title: string): number {
  const normalized = normalizeQuestionTitle(title);
  if (!normalized) return 0;
  return normalized.split(' ').length;
}

export function validateQuestionTitle(raw: string): string {
  const title = normalizeQuestionTitle(raw);
  if (!title) throw new Error('Title is required');
  if (!/[A-Za-z0-9]/.test(title)) throw new Error('Title must include a real word');
  if (countTitleWords(title) > MAX_TITLE_WORDS) throw new Error('Title must be 10 words or fewer');
  if (title.length > MAX_TITLE_CHARS) throw new Error('Title is too long');
  return title;
}
