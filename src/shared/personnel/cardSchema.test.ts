import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { USER_WRITABLE_FIELDS } from '../../main/personnel/userFields';
import { foundationEn } from '../locales/foundation.en';
import { foundationUa } from '../locales/foundation.ua';
import { CARD, CARD_FIELDS, STAFF_POST_FIELDS } from './cardSchema';
import { IMPULSE_RANKS } from './impulseDictionaries';

const writable = new Set<string>(USER_WRITABLE_FIELDS);

describe('the card', () => {
    it('has three categories: the Impulse card, awards and the staff position', () => {
        expect(CARD.map((c) => c.id)).toEqual(['personal', 'awards', 'post']);
    });

    it('shows each field once, and only fields the database stores', () => {
        const keys = CARD_FIELDS.map((f) => f.key);
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys.filter((key) => !writable.has(key))).toEqual([]);
        expect(STAFF_POST_FIELDS.filter((key) => !writable.has(key))).toEqual([]);
    });

    it('covers every column added for the Impulse card', () => {
        const migration = fs.readFileSync(
            path.resolve('src/main/db/migrations/010_personal_card.ts'),
            'utf8',
        );
        const added = [...migration.matchAll(/^ {4}'(\w+)',$/gm)].map((m) => m[1]);
        expect(added.length).toBeGreaterThan(80);
        const shown = new Set<string>(CARD_FIELDS.map((f) => f.key));
        expect(added.filter((column) => !shown.has(column))).toEqual([]);
    });

    it('has a label for every category, section and field, in both languages', () => {
        for (const locale of [foundationUa, foundationEn]) {
            for (const category of CARD) {
                expect(locale.card.categories[category.id]).toBeTruthy();
                for (const section of category.sections) {
                    expect(locale.card.sections[section.id]).toBeTruthy();
                }
            }
            for (const field of CARD_FIELDS) {
                expect((locale.card.fields as Record<string, string>)[field.key]).toBeTruthy();
            }
            for (const key of STAFF_POST_FIELDS) {
                expect((locale.card.fields as Record<string, string>)[key]).toBeTruthy();
            }
        }
    });

    it('offers the dictionaries of Impulse where Impulse has one', () => {
        const rank = CARD_FIELDS.find((f) => f.key === 'rank');
        expect(rank?.options).toBe(IMPULSE_RANKS);
        expect(IMPULSE_RANKS).toContain('єфрейтор');
        const fitness = CARD_FIELDS.find((f) => f.key === 'fitnessCategory');
        expect(fitness?.options).toContain('Придатний');
    });
});
