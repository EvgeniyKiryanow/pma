/**
 * Passwords that protect the data — sign-in (it can open the data key) and backup copies —
 * must not be the ones a brute-force attempt tries first. The rule stays short on purpose:
 * length, no repeats or keyboard runs, not a well-known password, digits only if long.
 */

export type PasswordWeakness =
    | 'too-short'
    | 'blank'
    | 'common'
    | 'repeated'
    | 'sequence'
    | 'digits';

/** Digits-only passwords (dates, phone parts) need this many digits. */
export const MIN_DIGITS_ONLY = 10;

const COMMON = new Set([
    'password',
    'password1',
    'password123',
    'passw0rd',
    'qwerty123',
    'qwertyuiop',
    '1q2w3e4r',
    '1q2w3e4r5t',
    '1qaz2wsx',
    'zaq12wsx',
    'zaq1xsw2',
    'iloveyou',
    'admin123',
    'administrator',
    'welcome1',
    'parol123',
    'пароль',
    'пароль123',
    'йцукенгш',
    'qwertyqwerty',
    'pmanager',
    'pmanager1',
    'pmanager123',
]);

const KEYBOARD_ROWS = [
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    'йцукенгшщзхї',
    'фівапролджє',
    'ячсмитьбю',
    '1234567890',
    'abcdefghijklmnopqrstuvwxyz',
    'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя',
];

/** "12345678", "87654321", "qwertyui", "ґдеєжзиі" and the like. */
function isRun(value: string): boolean {
    return KEYBOARD_ROWS.some((row) => {
        const reversed = [...row].reverse().join('');
        return row.includes(value) || reversed.includes(value);
    });
}

/** A short block written over and over: "12341234", "abcabcabc", "aaaaaaaa". */
function isRepeated(value: string): boolean {
    for (let size = 1; size <= 4 && size * 2 <= value.length; size++) {
        if (value.length % size !== 0) continue;
        if (value.slice(0, size).repeat(value.length / size) === value) return true;
    }
    return false;
}

export function passwordWeakness(password: unknown, minLength = 8): PasswordWeakness | null {
    if (typeof password !== 'string' || password.length < minLength) return 'too-short';
    if (password.trim().length === 0) return 'blank';
    const value = password.toLowerCase();
    if (COMMON.has(value)) return 'common';
    if (isRepeated(value)) return 'repeated';
    if (isRun(value)) return 'sequence';
    if (/^\d+$/.test(value) && value.length < MIN_DIGITS_ONLY) return 'digits';
    return null;
}

/** Ukrainian explanation of why a password was refused (shown as it is by the window). */
export function passwordWeaknessMessage(reason: PasswordWeakness, minLength = 8): string {
    switch (reason) {
        case 'too-short':
            return `Пароль має містити щонайменше ${minLength} символів`;
        case 'blank':
            return 'Пароль не може складатися лише з пробілів';
        case 'common':
            return 'Цей пароль є у словниках для підбору паролів. Придумайте інший';
        case 'repeated':
            return 'Пароль з повторів (як «12341234») підбирають миттєво. Придумайте інший';
        case 'sequence':
            return 'Пароль-послідовність (як «12345678» чи «qwerty») підбирають миттєво. Придумайте інший';
        case 'digits':
            return `Пароль лише з цифр має бути не коротшим за ${MIN_DIGITS_ONLY} цифр — або додайте літери`;
    }
}
