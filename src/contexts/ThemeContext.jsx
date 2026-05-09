import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

function getSystemDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/**
 * Theme modes: 'system' | 'light' | 'dark'
 * Default: 'system' (follows OS preference)
 */
export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('jlpt_theme_mode');
    return saved && ['system', 'light', 'dark'].includes(saved) ? saved : 'system';
  });

  const isDark = mode === 'dark' || (mode === 'system' && getSystemDark());

  const applyTheme = useCallback((dark) => {
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  // Apply theme on mode change
  useEffect(() => {
    localStorage.setItem('jlpt_theme_mode', mode);
    applyTheme(isDark);
  }, [mode, isDark, applyTheme]);

  // Listen to system theme changes when in system mode
  useEffect(() => {
    if (mode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => applyTheme(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mode, applyTheme]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
