'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type ThemeId, getStoredTheme, storeTheme } from '@/lib/themes';

const ThemeContext = createContext<{
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}>({ theme: 'nightowl', setTheme: () => {} });

const TextScaleContext = createContext<{
  scale: number;
  setScale: (n: number) => void;
}>({ scale: 1, setScale: () => {} });

const MIN_TEXT_SCALE = 0.85;
const MAX_TEXT_SCALE = 1.6;

function clampTextScale(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_TEXT_SCALE, Math.max(MIN_TEXT_SCALE, value));
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useTextScale(): { scale: number; setScale: (n: number) => void } {
  return useContext(TextScaleContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('nightowl');
  const [scale, setScaleState] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(getStoredTheme());
    const storedScale = Number.parseFloat(localStorage.getItem('slido_text_scale') ?? '');
    setScaleState(clampTextScale(storedScale));
    setMounted(true);
  }, []);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    storeTheme(t);
  };

  const setScale = (n: number) => {
    setScaleState(clampTextScale(n));
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.style.fontSize = `${scale * 100}%`;
    localStorage.setItem('slido_text_scale', String(scale));
  }, [mounted, scale]);

  if (!mounted) {
    return <div data-theme="nightowl">{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <TextScaleContext.Provider value={{ scale, setScale }}>
        {children}
      </TextScaleContext.Provider>
    </ThemeContext.Provider>
  );
}
