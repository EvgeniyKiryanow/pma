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

type AdditionalInfo = {
    unitName: string;
    commanderName: string;
};

type ReportsState = {
    users: User[];
    templates: Template[];
    savedTemplates: Template[];
    selectedTemplateId: string | number;
    selectedUserId: number | null;
    selectedUserId2: number | null;
    additionalInfo: AdditionalInfo | null;
    setAdditionalInfo: (info: AdditionalInfo | null) => void;
    setUsers: (users: User[]) => void;
    setSavedTemplates: (templates: any[]) => void;
    setSelectedTemplate: (id: string | number) => void;
    setSelectedUser: (id: number | null) => void;
    setSelectedUser2: (id: number | null) => void;
    addTemplate: (template: Template) => void;
    saveFilledTemplate: (template: Template) => void;
    addSavedTemplate: (tpl: SavedTemplate) => void;
    loadUsers: () => Promise<void>;
    loadDefaultTemplates: () => Promise<void>;
};

// Helper to read from localStorage
function getInitialAdditionalInfo(): AdditionalInfo | null {
    try {
        const raw = localStorage.getItem('reports_additionalInfo');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export const useReportsStore = create<ReportsState>((set) => ({
    users: [],
    templates: [],
    savedTemplates: [],
    selectedTemplateId: null,
    selectedUserId: null,
    selectedUserId2: null,

    additionalInfo: getInitialAdditionalInfo(),

    setAdditionalInfo: (info) => {
        if (info) {
            localStorage.setItem('reports_additionalInfo', JSON.stringify(info));
        } else {
            localStorage.removeItem('reports_additionalInfo');
        }
        set({ additionalInfo: info });
    },

    setUsers: (users) => set({ users }),
    setSavedTemplates: (templates) => set({ savedTemplates: templates }),
    setSelectedTemplate: (id) => set({ selectedTemplateId: id }),
    setSelectedUser: (id) => set({ selectedUserId: id }),
    setSelectedUser2: (id) => set({ selectedUserId2: id }),

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
        const data = await window.electronAPI.fetchUsersMetadata();
        set({ users: data });
    },

    loadDefaultTemplates: async () => {
        const templates = await window.electronAPI.getAllReportTemplates();
        set({ savedTemplates: templates });
    },
}));
