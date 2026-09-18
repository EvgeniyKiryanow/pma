import { create } from 'zustand';

import type { ReportTemplateRecord } from '../../../../shared/types/reports';
import { reportTemplatesApi } from '../../../shared/api/reports';

type ReportFilesStore = {
    files: ReportTemplateRecord[];
    loadFromDb: () => Promise<void>;
    /** Throws ApiError; the list is refreshed only after the file is stored. */
    addFileFromDisk: (file: File) => Promise<void>;
    removeFileById: (id: number) => Promise<void>;
};

/** Report templates uploaded by users. */
export const useReportFilesStore = create<ReportFilesStore>((set) => {
    const reload = async () => set({ files: await reportTemplatesApi.listUploaded() });

    return {
        files: [],
        loadFromDb: reload,

        addFileFromDisk: async (file) => {
            await reportTemplatesApi.upload(file);
            await reload();
        },

        removeFileById: async (id) => {
            await reportTemplatesApi.remove(id);
            await reload();
        },
    };
});
