import { describe, expect, it } from 'vitest';

import {
    ALL_PERMISSION_KEYS,
    dependentsOf,
    expandPermissions,
    isPermissionKey,
    PERMISSION_DEFINITIONS,
    PERMISSION_GROUPS,
    permissionsByGroup,
} from './permissions';

describe('permission registry', () => {
    it('every permission belongs to a declared group', () => {
        for (const permission of PERMISSION_DEFINITIONS) {
            expect(PERMISSION_GROUPS).toContain(permission.group);
        }
    });

    it('every group has at least one permission', () => {
        for (const { group, items } of permissionsByGroup()) {
            expect(items.length, `group ${group} is empty`).toBeGreaterThan(0);
        }
    });

    it('dependencies reference existing permissions', () => {
        for (const permission of PERMISSION_DEFINITIONS) {
            for (const required of permission.requires) {
                expect(isPermissionKey(required), `${permission.key} requires ${required}`).toBe(true);
            }
        }
    });

    it('no permission depends on itself, directly or through a cycle', () => {
        for (const permission of PERMISSION_DEFINITIONS) {
            expect(expandPermissions(permission.requires).has(permission.key)).toBe(false);
        }
    });
});

describe('expandPermissions', () => {
    it('adds dependencies transitively', () => {
        // personnel.import requires create+edit, and both require view
        expect([...expandPermissions(['personnel.import'])].sort()).toEqual([
            'personnel.create',
            'personnel.edit',
            'personnel.import',
            'personnel.view',
        ]);
    });

    it('pulls in permissions from other groups when needed', () => {
        const expanded = expandPermissions(['tables.edit']);
        expect(expanded.has('tables.view')).toBe(true);
        expect(expanded.has('personnel.view')).toBe(true);
        expect(expanded.has('staffing.view')).toBe(true);
    });

    it('ignores unknown keys instead of trusting them', () => {
        expect([...expandPermissions(['personnel.view', 'totally.made.up'])]).toEqual([
            'personnel.view',
        ]);
    });

    it('is stable when applied twice', () => {
        const once = expandPermissions(['reports.templates']);
        const twice = expandPermissions(once);
        expect([...twice].sort()).toEqual([...once].sort());
    });

    it('expanding everything yields the full registry', () => {
        expect(expandPermissions(ALL_PERMISSION_KEYS).size).toBe(ALL_PERMISSION_KEYS.length);
    });
});

describe('dependentsOf', () => {
    it('finds permissions that stop working without the given one', () => {
        const dependents = dependentsOf('personnel.view');
        expect(dependents).toContain('personnel.edit');
        expect(dependents).toContain('reports.view');
        expect(dependents).toContain('tables.view');
    });

    it('returns nothing for a permission nobody depends on', () => {
        expect(dependentsOf('system.reset')).toEqual([]);
    });
});
