import { create } from 'zustand';

import type { UnitInfo } from '../../../../shared/types/settings';
import type { User } from '../../../../shared/types/user';
import { settingsApi } from '../../../shared/api/files';
import { personnelApi } from '../../../shared/api/personnel';
import { reportTemplatesApi } from '../../../shared/api/reports';

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

/** Unit details for documents; stored in the database so backups carry them. */
type AdditionalInfo = UnitInfo;

type ReportsState = {
    users: User[];
    templates: Template[];
    savedTemplates: Template[];
    selectedTemplateId: string | number;
    selectedUserId: number | null;
    selectedUserId2: number | null;
    additionalInfo: AdditionalInfo | null;
    loadAdditionalInfo: () => Promise<void>;
    setAdditionalInfo: (info: AdditionalInfo | null) => Promise<void>;
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

const LEGACY_STORAGE_KEY = 'reports_additionalInfo';

/**
 * Older versions kept the unit details in the window's local storage, where backups never
 * reached them. Read once to move them into the database.
 */
function takeLegacyAdditionalInfo(): AdditionalInfo | null {
    try {
        const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object'
            ? {
                  unitName: String(parsed.unitName ?? ''),
                  commanderName: String(parsed.commanderName ?? ''),
              }
            : null;
    } catch {
        return null;
    }
}

function forgetLegacyAdditionalInfo(): void {
    try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
        // storage unavailable: nothing to clean up
    }
}

export const useReportsStore = create<ReportsState>((set) => ({
    users: [],
    templates: [],
    savedTemplates: [],
    selectedTemplateId: null,
    selectedUserId: null,
    selectedUserId2: null,

    additionalInfo: null,

    loadAdditionalInfo: async () => {
        let info = await settingsApi.getUnitInfo();
        const legacy = takeLegacyAdditionalInfo();
        if (legacy) {
            if (!info) info = await settingsApi.updateUnitInfo(legacy);
            forgetLegacyAdditionalInfo();
        }
        set({ additionalInfo: info });
    },

    setAdditionalInfo: async (info) => {
        set({ additionalInfo: await settingsApi.updateUnitInfo(info) });
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
        const data = await personnelApi.list();
        set({ users: data });
    },

    loadDefaultTemplates: async () => {
        const templates = await reportTemplatesApi.listBundled();
        set({ savedTemplates: templates });
    },
}));
