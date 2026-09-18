import { randomUUID } from 'crypto';

import {
    ALL_PERMISSION_KEYS,
    isPermissionKey,
    type PermissionKey,
} from '../../../shared/auth/permissions';
import type { RoleDTO, RoleInput, SessionInfo } from '../../../shared/auth/types';
import { AppError } from '../../../shared/ipc/result';
import type { Logger } from '../../core/logger';
import type { Transactor } from '../../db/types';
import type { RoleRepository, RoleRow } from '../repositories/RoleRepository';
import type { AuthService } from './AuthService';
import { validateId, validateRoleName } from './validation';

function toRoleDTO(row: RoleRow, permissions: string[]): RoleDTO {
    const grantsAll = Boolean(row.grants_all);
    return {
        id: row.id,
        uuid: row.uuid,
        name: row.name,
        description: row.description,
        isSystem: Boolean(row.is_system),
        grantsAll,
        permissions: grantsAll ? [...ALL_PERMISSION_KEYS] : permissions.filter(isPermissionKey),
        accountCount: row.account_count,
    };
}

export class RoleService {
    constructor(
        private readonly database: Transactor,
        private readonly roles: RoleRepository,
        private readonly auth: AuthService,
        private readonly logger: Logger,
    ) {}

    async list(): Promise<RoleDTO[]> {
        const [rows, permissions] = await Promise.all([
            this.roles.list(),
            this.roles.permissionsByRole(),
        ]);
        return rows.map((row) => toRoleDTO(row, permissions.get(row.id) ?? []));
    }

    async create(actor: SessionInfo, input: RoleInput): Promise<RoleDTO> {
        const name = validateRoleName(input?.name);
        const description = String(input?.description ?? '').trim();
        const permissions = this.validatePermissions(input?.permissions);

        const id = await this.database.transaction(async () => {
            await this.assertNameFree(name);
            const roleId = await this.roles.create({ uuid: randomUUID(), name, description });
            await this.roles.replacePermissions(roleId, permissions);
            return roleId;
        });

        this.logger.info(`Role #${id} created by account #${actor.accountId}`);
        return this.get(id);
    }

    async update(actor: SessionInfo, idInput: number, input: RoleInput): Promise<RoleDTO> {
        const id = validateId(idInput);
        const name = validateRoleName(input?.name);
        const description = String(input?.description ?? '').trim();

        await this.database.transaction(async () => {
            const role = await this.require(id);
            await this.assertNameFree(name, id);
            await this.roles.update(id, { name, description });
            // The system role always grants everything; its permission list is not editable.
            if (!role.is_system) {
                await this.roles.replacePermissions(
                    id,
                    this.validatePermissions(input?.permissions),
                );
            }
        });

        this.logger.info(`Role #${id} updated by account #${actor.accountId}`);
        await this.auth.refreshSessions((s) => s.roleId === id);
        return this.get(id);
    }

    async remove(actor: SessionInfo, idInput: number): Promise<void> {
        const id = validateId(idInput);
        await this.database.transaction(async () => {
            const role = await this.require(id);
            if (role.is_system) throw new AppError('VALIDATION', 'Системну роль видалити не можна');
            if (role.account_count > 0) {
                throw new AppError('CONFLICT', 'Роль призначена користувачам', {
                    accountCount: role.account_count,
                });
            }
            await this.roles.delete(id);
        });
        this.logger.warn(`Role #${id} deleted by account #${actor.accountId}`);
    }

    private async get(id: number): Promise<RoleDTO> {
        const row = await this.require(id);
        return toRoleDTO(row, await this.roles.permissionsOf(id));
    }

    private async require(id: number): Promise<RoleRow> {
        const role = await this.roles.findById(id);
        if (!role) throw new AppError('NOT_FOUND');
        return role;
    }

    private async assertNameFree(name: string, exceptId?: number): Promise<void> {
        // Compared in JS: SQLite's NOCASE collation only folds ASCII, so "Оператор" and
        // "оператор" would both be allowed and confuse administrators.
        const wanted = name.toLocaleLowerCase('uk-UA');
        const clash = (await this.roles.list()).find(
            (role) => role.id !== exceptId && role.name.toLocaleLowerCase('uk-UA') === wanted,
        );
        if (clash) {
            throw new AppError('CONFLICT', 'Роль з такою назвою вже існує', { field: 'name' });
        }
    }

    private validatePermissions(value: unknown): PermissionKey[] {
        if (!Array.isArray(value)) {
            throw new AppError('VALIDATION', undefined, { field: 'permissions' });
        }
        const unknown = value.filter((p) => !isPermissionKey(p));
        if (unknown.length) {
            throw new AppError('VALIDATION', 'Невідомі права доступу', { unknown });
        }
        return [...new Set(value as PermissionKey[])];
    }
}
