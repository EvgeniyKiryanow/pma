import { create } from 'zustand';

type DbReport = {
    id: number;
    name: string;
    filePath: string;
    createdAt: string;
    buffer?: ArrayBuffer;
};

type ReportFilesStore = {
    files: DbReport[];
    loadFromDb: () => Promise<void>;
    addFileFromDisk: (file: File) => Promise<void>;
    removeFileById: (id: number) => Promise<void>;
};

export const useReportFilesStore = create<ReportFilesStore>((set) => ({
    files: [],

    loadFromDb: async () => {
        const dbFiles = await window.electronAPI.getReportTemplatesFromDb();
        set({ files: dbFiles });
    },

    // addFileFromDisk: async (file: File) => {
    //     const buffer = await file.arrayBuffer();

    //     // ✅ Save file to disk using IPC
    //     const savedPath = await window.electronAPI.saveReportFileToDisk(buffer, file.name);

    //     // ✅ Register in SQLite
    //     await window.electronAPI.addReportTemplateToDb(file.name, savedPath);

    //     // 🔄 Refresh file list
    //     const dbFiles = await window.electronAPI.getReportTemplatesFromDb();
    //     set({ files: dbFiles });
    // },
    addFileFromDisk: async (file: File) => {
        const buffer = await file.arrayBuffer();

        // Save to disk via IPC
        const savedPath = await window.electronAPI.saveReportFileToDisk(buffer, file.name);

        // Save metadata + buffer in memory
        set((state) => ({
            files: [
                ...state.files,
                {
                    id: Date.now(), // or you get ID from DB
                    name: file.name,
                    filePath: savedPath,
                    createdAt: new Date().toISOString(),
                    buffer, // store this so you can download it later
                },
            ],
        }));
    },

    removeFileById: async (id: number) => {
        // 👀 Get file info from DB
        const dbFiles = await window.electronAPI.getReportTemplatesFromDb();
        const fileToDelete = dbFiles.find((f) => f.id === id);
        if (!fileToDelete) return;

        // 🗑 Remove file via main process
        await window.electronAPI.deleteReportTemplateFromDb(id);

        // 🔄 Refresh list
        const refreshed = await window.electronAPI.getReportTemplatesFromDb();
        set({ files: refreshed });
    },
}));
