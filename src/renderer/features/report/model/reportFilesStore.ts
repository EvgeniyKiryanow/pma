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

/** Saved reports: files the unit keeps (generated documents, tables, scans). */
export const useReportFilesStore = create<ReportFilesStore>((set) => {
    // Templates live in the template library; this list is the unit's saved reports.
    const reload = async () =>
        set({
            files: (await reportTemplatesApi.listUploaded()).filter(
                (file) => file.kind !== 'template',
            ),
        });

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
