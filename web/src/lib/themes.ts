export type ThemeId = 'nightowl' | 'paper' | 'electric';

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
}

export const themes: Theme[] = [
  { id: 'nightowl', name: 'Night Owl', description: 'Deep oceanic dark with warm amber accents' },
  { id: 'paper', name: 'Paper', description: 'Clean, warm editorial with ink and cream' },
  { id: 'electric', name: 'Electric', description: 'High-contrast neon on charcoal' },
];

export function getStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return 'nightowl';
  return (localStorage.getItem('slido_theme') as ThemeId) || 'nightowl';
}

export function storeTheme(theme: ThemeId) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('slido_theme', theme);
  }
}
