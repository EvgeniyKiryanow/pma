import { describe, expect, it } from 'vitest';

import { staffCategoryName } from './staffCategory';

describe('staff category', () => {
    it('names the abbreviations of the БЧС in full', () => {
        expect(staffCategoryName('оф')).toBe('Офіцерський склад (оф)');
        expect(staffCategoryName('С-т')).toBe('Сержантський і старшинський склад (С-т)');
        expect(staffCategoryName('солд.')).toBe('Рядовий склад (солд.)');
        expect(staffCategoryName('Рядовий склад')).toBe('Рядовий склад');
        expect(staffCategoryName('')).toBe('');
    });
});
