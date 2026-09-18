import { describe, expect, it } from 'vitest';

import { passwordWeakness, passwordWeaknessMessage } from './passwordStrength';

describe('passwordWeakness', () => {
    it.each([
        ['1234567', 'too-short'],
        ['        ', 'blank'],
        ['password', 'common'],
        ['Qwerty123', 'common'],
        ['12341234', 'repeated'],
        ['abababab', 'repeated'],
        ['aaaaaaaa', 'repeated'],
        ['12345678', 'sequence'],
        ['87654321', 'sequence'],
        ['qwertyui', 'sequence'],
        ['йцукенгш', 'common'],
        ['фівапрол', 'sequence'],
        ['19900309', 'digits'],
        ['123456789', 'sequence'],
    ])('refuses %s (%s)', (password, reason) => {
        expect(passwordWeakness(password)).toBe(reason);
    });

    it.each([
        'Rota-Parol-2026',
        'сосна-міст-дощ',
        'Kopiya2026!',
        '0501234567890',
        'zelenyi chainyk',
    ])('accepts %s', (password) => {
        expect(passwordWeakness(password)).toBeNull();
    });

    it('explains every reason in Ukrainian', () => {
        for (const reason of [
            'too-short',
            'blank',
            'common',
            'repeated',
            'sequence',
            'digits',
        ] as const) {
            expect(passwordWeaknessMessage(reason)).toMatch(/[А-Яа-яІіЇїЄє]/);
        }
    });
});
