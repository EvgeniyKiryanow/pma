import { contextBridge, webFrame } from 'electron';

import { appApi } from './api/app';
import { backupApi, changeLogApi } from './api/backup';
import { commentsApi, directivesApi, historyApi, personnelApi } from './api/personnel';
import { namedListApi, remindersApi, reportsApi, staffingApi } from './api/reports';
import { accountsApi, auditApi, authApi, eventsApi, rolesApi } from './api/security';

/**
 * The only bridge between the renderer and the main process. Its type is the renderer's
 * contract (`window.electronAPI`), so it is defined exactly once. Every channel is
 * authorized in the main process; nothing here is trusted.
 *
 * Each domain lives in `./api/*`. New features get their own namespace (`api.feature.action`);
 * the flat members below are spread in for the screens that already use them.
 */
const api = {
    auth: authApi,
    accounts: accountsApi,
    roles: rolesApi,
    audit: auditApi,
    backup: backupApi,
    events: eventsApi,
    directives: directivesApi,
    shtatni: staffingApi,
    namedList: namedListApi,

    ...changeLogApi,
    ...personnelApi,
    ...historyApi,
    ...commentsApi,
    ...reportsApi,
    ...remindersApi,
    ...appApi,

    // ========= Interface scale =========
    // Page zoom (like Ctrl +/-): content gets smaller or larger, the window keeps its size.
    ui: {
        setZoomFactor: (factor: number) => {
            if (Number.isFinite(factor))
                webFrame.setZoomFactor(Math.min(1.5, Math.max(0.6, factor)));
        },
        getZoomFactor: () => webFrame.getZoomFactor(),
    },
};

export type ElectronAPI = typeof api;

contextBridge.exposeInMainWorld('electronAPI', api);
