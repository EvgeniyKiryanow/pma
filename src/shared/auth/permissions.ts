/**
 * Single source of truth for access control.
 *
 * - Main process enforces these keys on every IPC channel.
 * - Renderer uses the same keys to show/hide navigation and actions.
 * - Roles store a subset of these keys; a role with `grantsAll` gets every key,
 *   including keys added in future versions.
 *
 * Adding a permission: append it here, add labels to locales (`permissions.*`),
 * then reference it from the IPC registration and the UI. No migration needed.
 */

export const PERMISSION_GROUPS = [
    'personnel',
    'directives',
    'staffing',
    'reports',
    'tables',
    'data',
    'administration',
] as const;

export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

type PermissionDefinitionInput = {
    key: string;
    group: PermissionGroup;
    /** Permissions that are implicitly granted together with this one. */
    requires?: readonly string[];
    /** Highlighted in the role editor: destructive or security-sensitive. */
    sensitive?: boolean;
};

export const PERMISSIONS = [
    { key: 'personnel.view', group: 'personnel' },
    { key: 'personnel.create', group: 'personnel', requires: ['personnel.view'] },
    { key: 'personnel.edit', group: 'personnel', requires: ['personnel.view'] },
    { key: 'personnel.delete', group: 'personnel', requires: ['personnel.view'], sensitive: true },
    {
        key: 'personnel.import',
        group: 'personnel',
        requires: ['personnel.create', 'personnel.edit'],
    },
    { key: 'history.edit', group: 'personnel', requires: ['personnel.view'] },

    { key: 'directives.view', group: 'directives', requires: ['personnel.view'] },
    { key: 'directives.edit', group: 'directives', requires: ['directives.view'] },

    { key: 'staffing.view', group: 'staffing' },
    { key: 'staffing.edit', group: 'staffing', requires: ['staffing.view'] },

    { key: 'reports.view', group: 'reports', requires: ['personnel.view'] },
    { key: 'reports.templates', group: 'reports', requires: ['reports.view'] },

    { key: 'tables.view', group: 'tables', requires: ['personnel.view', 'staffing.view'] },
    { key: 'tables.edit', group: 'tables', requires: ['tables.view'] },

    { key: 'backup.export', group: 'data', sensitive: true },
    { key: 'backup.import', group: 'data', sensitive: true },
    { key: 'sync.export', group: 'data', sensitive: true },
    { key: 'sync.import', group: 'data', sensitive: true },
    { key: 'system.reset', group: 'data', sensitive: true },

    { key: 'accounts.manage', group: 'administration', sensitive: true },
    { key: 'roles.manage', group: 'administration', sensitive: true },
    { key: 'audit.view', group: 'administration', sensitive: true },
] as const satisfies readonly PermissionDefinitionInput[];

export type PermissionKey = (typeof PERMISSIONS)[number]['key'];

export type PermissionDefinition = {
    key: PermissionKey;
    group: PermissionGroup;
    requires: readonly PermissionKey[];
    sensitive: boolean;
};

export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = PERMISSIONS.map((p) => ({
    key: p.key,
    group: p.group,
    requires: ('requires' in p ? p.requires : []) as readonly PermissionKey[],
    sensitive: 'sensitive' in p ? Boolean(p.sensitive) : false,
}));

export const ALL_PERMISSION_KEYS: readonly PermissionKey[] = PERMISSION_DEFINITIONS.map(
    (p) => p.key,
);

const DEFINITION_BY_KEY = new Map(PERMISSION_DEFINITIONS.map((p) => [p.key, p]));

export function isPermissionKey(value: unknown): value is PermissionKey {
    return typeof value === 'string' && DEFINITION_BY_KEY.has(value as PermissionKey);
}

/**
 * Drops unknown keys and adds everything the given keys depend on (transitively).
 * Stored role permissions stay minimal; effective permissions are always expanded.
 */
export function expandPermissions(keys: Iterable<string>): Set<PermissionKey> {
    const result = new Set<PermissionKey>();
    const stack = [...keys].filter(isPermissionKey);

    while (stack.length) {
        const key = stack.pop() as PermissionKey;
        if (result.has(key)) continue;
        result.add(key);
        for (const dep of DEFINITION_BY_KEY.get(key)?.requires ?? []) stack.push(dep);
    }
    return result;
}

/** Keys that depend on `key` (used by the role editor to uncheck dependents). */
export function dependentsOf(key: PermissionKey): PermissionKey[] {
    return PERMISSION_DEFINITIONS.filter((p) => expandPermissions(p.requires).has(key)).map(
        (p) => p.key,
    );
}

export function permissionsByGroup(): { group: PermissionGroup; items: PermissionDefinition[] }[] {
    return PERMISSION_GROUPS.map((group) => ({
        group,
        items: PERMISSION_DEFINITIONS.filter((p) => p.group === group),
    }));
}
