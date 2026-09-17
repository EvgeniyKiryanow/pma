/** Tab identifiers, kept free of component imports so stores can use them without cycles. */
export const TAB_KEY_LIST = [
    'manager',
    'reports',
    'backups',
    'importUsers',
    'shtatni',
    'instructions',
    'admin',
] as const;

export type TabKey = (typeof TAB_KEY_LIST)[number];

export const TAB_KEYS: ReadonlySet<string> = new Set(TAB_KEY_LIST);

export function isTabKey(value: unknown): value is TabKey {
    return typeof value === 'string' && TAB_KEYS.has(value);
}
