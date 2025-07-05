import { create } from 'zustand';
import { en } from '../locales/en';
import { ua } from '../locales/ua';

type Language = 'en' | 'ua';

const translations = {
    en,
    ua,
};

type I18nStore = {
    language: Language;
    t: (key: string) => string;
    setLanguage: (lang: Language) => void;
};

export const useI18nStore = create<I18nStore>((set, get) => ({
    language: 'ua',
    t: (key: string) => {
        const lang = get().language;
        const keys = key.split('.');
        let value: any = translations[lang];
        for (const k of keys) {
            value = value?.[k];
        }
        return value ?? key;
    },
    setLanguage: (lang) => set({ language: lang }),
}));
