import { AppError } from '../../../shared/ipc/result';

const USERNAME_PATTERN = /^[\p{L}\p{N}._-]{3,32}$/u;

export function normalizeUsername(value: unknown): string {
    return String(value ?? '')
        .trim()
        .toLowerCase();
}

export function validateUsername(value: unknown): string {
    const username = normalizeUsername(value);
    if (!USERNAME_PATTERN.test(username)) {
        throw new AppError(
            'VALIDATION',
            'Логін: 3–32 символи, літери, цифри, крапка, дефіс або підкреслення',
            { field: 'username' },
        );
    }
    return username;
}

export function validateDisplayName(value: unknown): string {
    const name = String(value ?? '').trim();
    if (name.length > 128) {
        throw new AppError('VALIDATION', 'Імʼя занадто довге', { field: 'displayName' });
    }
    return name;
}

export function validateRoleName(value: unknown): string {
    const name = String(value ?? '').trim();
    if (name.length < 2 || name.length > 64) {
        throw new AppError('VALIDATION', 'Назва ролі: від 2 до 64 символів', { field: 'name' });
    }
    return name;
}

export function validateId(value: unknown, field = 'id'): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new AppError('VALIDATION', undefined, { field });
    return id;
}
