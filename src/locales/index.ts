import { createI18n } from 'vue-i18n';
import zhCN from './zh-CN.json';
import en from './en.json';

// Read saved language from localStorage, default to zh-CN
const savedLang = localStorage.getItem('language') || 'zh-CN';

const i18n = createI18n({
  legacy: false,
  locale: savedLang,
  fallbackLocale: 'en',
  messages: {
    'zh-CN': zhCN,
    en: en,
  },
});

export default i18n;
