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
    users: User[];
    templates: Template[];
    savedTemplates: Template[];
    selectedTemplateId: string | number;
    selectedUserId: number | null;
    setUsers: (users: User[]) => void;
    setSavedTemplates: (templates: any[]) => void;
    setSelectedTemplate: (id: string | number) => void;
    setSelectedUser: (id: number | null) => void;
    addTemplate: (template: Template) => void;
    saveFilledTemplate: (template: Template) => void;
    addSavedTemplate: (tpl: SavedTemplate) => void;
    loadUsers: () => Promise<void>;
    loadDefaultTemplates: () => Promise<void>;
};

export const useReportsStore = create<ReportsState>((set) => ({
    users: [],
    templates: [],
    savedTemplates: [],
    selectedTemplateId: null,
    selectedUserId: null,

    setUsers: (users) => set({ users }),
    setSavedTemplates: (templates) => set({ savedTemplates: templates }),
    setSelectedTemplate: (id) => set({ selectedTemplateId: id }),
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

    loadUsers: async () => {
        const data = await window.electronAPI.fetchUsers();
        set({ users: data });
    },

    loadDefaultTemplates: async () => {
        const templates = await window.electronAPI.getAllReportTemplates();
        set({ savedTemplates: templates });
    },
}));
