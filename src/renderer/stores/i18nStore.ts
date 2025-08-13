import { create } from 'zustand';

import { en } from '../../locales/en';
import { ua } from '../../locales/ua';

type Language = 'en' | 'ua';

const translations = {
    en,
    ua,
};

type I18nStore = {
    language: Language;
    t: (key: string, vars?: Record<string, any>) => string;
    setLanguage: (lang: Language) => void;
};

export const useI18nStore = create<I18nStore>((set, get) => ({
    language: 'ua',
    t: (key: string, vars?: Record<string, any>) => {
        const lang = get().language;
        const keys = key.split('.');
        let value: any = translations[lang];

        for (const k of keys) {
            value = value?.[k];
        }

        if (typeof value === 'string' && vars) {
            return value.replace(/\{\{(\w+)\}\}/g, (_, varName) =>
                vars[varName] !== undefined ? vars[varName] : `{{${varName}}}`,
            );
        }

        return typeof value === 'string' ? value : key;
    },
    setLanguage: (lang) => set({ language: lang }),
}));
