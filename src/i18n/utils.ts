import { ui, defaultLang } from './ui';

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  }
}

export function slugifyCategory(cat: string, lang: 'fr' | 'en'): string {
  const base = cat.toLowerCase().replace(/\s+/g, '-');
  if (lang !== 'fr') return base;
  return base
    .replace(/[éèê]/g, 'e')
    .replace(/[àâ]/g, 'a')
    .replace(/[ùû]/g, 'u')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o');
}

export function getCategoryUrl(cat: string, lang: 'fr' | 'en'): string {
  const slug = slugifyCategory(cat, lang);
  return lang === 'fr' ? `/blog/categorie/${slug}` : `/en/blog/category/${slug}`;
}
