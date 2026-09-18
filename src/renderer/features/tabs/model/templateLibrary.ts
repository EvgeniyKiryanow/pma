import { create } from 'zustand';

import { reportTemplatesApi } from '../../../shared/api/reports';

export type TemplateSource = 'bundled' | 'uploaded';

/** A DOCX template: shipped with the program, or uploaded by the unit (stored, in backups). */
export type LibraryTemplate = {
    id: string;
    name: string;
    source: TemplateSource;
    timestamp?: number;
    /** Uploaded: the file in the reports folder and its record. */
    filePath?: string;
    recordId?: number;
    /** Loaded when first needed (uploaded templates are read on demand). */
    content?: ArrayBuffer;
};

type TemplateLibrary = {
    templates: LibraryTemplate[];
    loaded: boolean;
    load: () => Promise<void>;
    /** Stores .docx files as templates; returns how many were added. Throws ApiError. */
    upload: (files: File[]) => Promise<number>;
    remove: (template: LibraryTemplate) => Promise<void>;
    /** The content of a template, reading an uploaded one from the reports folder once. */
    contentOf: (template: LibraryTemplate) => Promise<ArrayBuffer>;
};

const withoutExtension = (name: string) => name.replace(/\.docx$/i, '');

export const useTemplateLibrary = create<TemplateLibrary>((set, get) => ({
    templates: [],
    loaded: false,

    load: async () => {
        const [bundled, uploaded] = await Promise.all([
            reportTemplatesApi.listBundled(),
            reportTemplatesApi.listUploaded(),
        ]);
        const templates: LibraryTemplate[] = [
            ...uploaded
                .filter((record) => record.kind === 'template')
                .map((record) => ({
                    id: `u:${record.id}`,
                    name: withoutExtension(record.name),
                    source: 'uploaded' as const,
                    timestamp: Date.parse(record.createdAt) || undefined,
                    filePath: record.filePath,
                    recordId: record.id,
                    // Keep content already read (the list is reloaded after every change).
                    content: get().templates.find((t) => t.id === `u:${record.id}`)?.content,
                })),
            ...bundled.map((template) => ({
                id: `b:${template.id}`,
                name: template.name,
                source: 'bundled' as const,
                timestamp: template.timestamp,
                content: template.content,
            })),
        ];
        set({ templates, loaded: true });
    },

    upload: async (files) => {
        const docx = files.filter((file) => /\.docx$/i.test(file.name));
        for (const file of docx) await reportTemplatesApi.upload(file, 'template');
        await get().load();
        return docx.length;
    },

    remove: async (template) => {
        if (template.source !== 'uploaded' || template.recordId === undefined) return;
        await reportTemplatesApi.remove(template.recordId);
        await get().load();
    },

    contentOf: async (template) => {
        if (template.content) return template.content;
        if (!template.filePath) throw new Error('Template has no file');
        const content = await reportTemplatesApi.readFile(template.filePath);
        set((state) => ({
            templates: state.templates.map((t) => (t.id === template.id ? { ...t, content } : t)),
        }));
        return content;
    },
}));
