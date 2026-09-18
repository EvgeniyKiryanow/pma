import { create } from 'zustand';

import { backupApi } from '../../../shared/api/backup';

type OpenedBackupState = {
    /** Name of the .pmb file the program was opened with, until the restore screen takes it. */
    name: string | null;
    refresh: () => Promise<void>;
    clear: () => void;
};

/**
 * A double-click on a .pmb file in Windows Explorer opens the program with it: the window
 * goes to the restore screen and the file is already chosen there (see RestoreBackupFlow).
 */
export const useOpenedBackupStore = create<OpenedBackupState>((set) => ({
    name: null,
    refresh: async () => {
        try {
            set({ name: await backupApi.openedFileName() });
        } catch {
            set({ name: null });
        }
    },
    clear: () => set({ name: null }),
}));

let watching = false;

/** Checks for a file given at start, and listens for files given while running. */
export function watchOpenedBackups(): void {
    if (watching) return;
    watching = true;
    const { refresh } = useOpenedBackupStore.getState();
    void refresh();
    backupApi.onFileOpened(() => void refresh());
}
