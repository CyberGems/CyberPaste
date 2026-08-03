import { useEffect, useState } from 'react';

export type ThemeId = 'cyberpaste' | 'dark' | 'light' | 'system';

const THEME_CLASSES = ['cyberpaste', 'dark', 'light'] as const;

const getSystemIsDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

// System follows the OS but keeps the app's own dark face: cyberpaste.
// Matches CyberSnap behaviour (System never adds its own material).
const resolveTheme = (theme: string): 'cyberpaste' | 'dark' | 'light' => {
  const id = (theme || 'cyberpaste') as ThemeId;
  if (id === 'dark' || id === 'light' || id === 'cyberpaste') return id;
  // 'system' (or any unknown legacy value)
  return getSystemIsDark() ? 'cyberpaste' : 'light';
};

export function useTheme(theme: string) {
  const [effectiveTheme, setEffectiveTheme] = useState<'cyberpaste' | 'dark' | 'light'>(() =>
    resolveTheme(theme)
  );

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (t: string) => {
      const resolved = resolveTheme(t);
      root.classList.remove(...THEME_CLASSES);
      root.classList.add(resolved);
      setEffectiveTheme(resolved);
    };

    applyTheme(theme);

    // Re-resolve when the OS theme changes while "system" is selected
    if ((theme || 'cyberpaste') === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return effectiveTheme;
}
