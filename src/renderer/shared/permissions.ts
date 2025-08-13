// src/shared/permissions.ts
export type TabKey =
    | 'manager'
    | 'backups'
    | 'reports'
    | 'tables'
    | 'importUsers'
    | 'shtatni'
    | 'instructions'
    | 'admin';

export function canAccess(tab: TabKey, allowedTabs: string[]) {
    return allowedTabs.includes(tab);
}
