import { ipcMain } from 'electron';

import { getDb } from '../../../database/db';

export function registerAppIdHandlers() {
    ipcMain.handle('app:get-key', async () => {
        const db = await getDb();
        const row = await db.get('SELECT key FROM app_identity LIMIT 1');
        return row?.key || null;
    });
}
