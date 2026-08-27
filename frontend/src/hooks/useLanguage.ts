import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const SUPPORTED = ['de', 'en', 'es', 'fr', 'ja', 'zh'] as const;

function resolveAutoLanguage(): string {
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase();
  const base = nav.split('-')[0];
  return (SUPPORTED as readonly string[]).includes(base) ? base : 'en';
}

export function useLanguage(language?: string) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const target = !language || language === 'auto' ? resolveAutoLanguage() : language;
    if (target && i18n.language !== target) {
      i18n.changeLanguage(target);
      localStorage.setItem('cyberpaste_language', target);
    } else if (language === 'auto' || !language) {
      localStorage.setItem('cyberpaste_language', i18n.language);
    }
  }, [language, i18n]);

  const changeLanguage = async (newLang: string) => {
    const target = newLang === 'auto' ? resolveAutoLanguage() : newLang;
    await i18n.changeLanguage(target);
    localStorage.setItem('cyberpaste_language', target);
  };

  return {
    currentLanguage: i18n.language,
    changeLanguage,
    t: i18n.t,
  };
}
