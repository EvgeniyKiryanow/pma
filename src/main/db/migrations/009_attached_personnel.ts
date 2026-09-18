import { addMissingColumns } from './helpers';
import type { Migration } from './types';

/**
 * Attached personnel (прикомандировані): people who serve with the unit but belong to
 * another one. They are counted in their own row of the reports, not in the unit's total.
 * `attachedFrom` is where they came from (free text, e.g. «2 рота 1 батальйону»).
 */
export const attachedPersonnel: Migration = {
    version: 9,
    name: 'attached-personnel',
    async up(db) {
        await addMissingColumns(db, 'users', {
            isAttached: 'INTEGER NOT NULL DEFAULT 0',
            attachedFrom: 'TEXT',
        });
    },
};
