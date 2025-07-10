import { create } from 'zustand';
import type { User } from '../types/user';

type Template = {
    id: string | number;
    name: string;
    content: ArrayBuffer;
};
type SavedTemplate = {
    id: string;
    name: string;
    content: ArrayBuffer;
    timestamp: number;
};

type ReportsState = {
    templates: Template[];
    selectedTemplateId: string | number;
    selectedUserId: number | null;
    savedTemplates: Template[];
    setSelectedTemplate: (id: string | number) => void;
    setSelectedUser: (id: number | null) => void;
    addTemplate: (template: Template) => void;
    saveFilledTemplate: (template: Template) => void;
    addSavedTemplate: (tpl: SavedTemplate) => void;
    setSavedTemplates: (templates: any[]) => void;
};

export const useReportsStore = create<ReportsState>((set) => ({
    templates: [],
    selectedTemplateId: null,
    selectedUserId: null,
    savedTemplates: [],
    setSelectedTemplate: (id: string | number) => set({ selectedTemplateId: id }),
    setSelectedUser: (id) => set({ selectedUserId: id }),
    addTemplate: (template) =>
        set((state) => ({
            templates: [...state.templates, template],
        })),
    saveFilledTemplate: (template) =>
        set((state) => ({
            savedTemplates: [...state.savedTemplates, template],
        })),
    addSavedTemplate: (tpl) =>
        set((state) => ({
            savedTemplates: [...state.savedTemplates, tpl],
        })),
    setSavedTemplates: (templates) => set({ savedTemplates: templates }),
}));
