import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';
import tr from './locales/tr.json';
import es from './locales/es.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';

// Language configuration
export const languages = [
  { code: 'ar', name: 'العربية', nativeName: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', flag: '🇺🇸' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr', flag: '🇹🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr', flag: '🇪🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', dir: 'ltr', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr', flag: '🇯🇵' },
];

// Get system language (browser language)
const browserLanguage = navigator.language.split('-')[0]; // 'ar-SA' -> 'ar'
const supportedLanguages = languages.map(l => l.code);
const systemLanguage = supportedLanguages.includes(browserLanguage) ? browserLanguage : 'en';

// Use saved language if exists, otherwise use system language
const savedLanguage = localStorage.getItem('language') || systemLanguage;

i18n.use(initReactI18next).init({
  resources: {
    en: en,
    ar: ar,
    tr: tr,
    es: es,
    zh: zh,
    ja: ja
  },
  lng: savedLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

// Update HTML dir attribute based on language
const currentLang = languages.find(l => l.code === savedLanguage);
document.documentElement.dir = currentLang?.dir || 'ltr';
document.documentElement.lang = savedLanguage;

export default i18n;
