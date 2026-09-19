import { addMissingColumns } from './helpers';
import type { Migration } from './types';

/**
 * Photos are stored in the person's row as they were chosen — a phone photo is megabytes —
 * and the personnel list, read on every screen, carried all of them. `photoThumb` is a small
 * picture for lists; the list sends it instead of the photo. The partial index finds the
 * photos that still need one (older photos, photos from a change log of an older version)
 * without reading the photos themselves.
 */
export const photoThumbnails: Migration = {
    version: 16,
    name: 'photo-thumbnails',
    async up(db) {
        await addMissingColumns(db, 'users', { photoThumb: 'TEXT' });
        await db.exec(`
            CREATE INDEX ix_users_photo_without_thumb ON users(id)
                WHERE photoThumb IS NULL AND photo IS NOT NULL AND photo <> '';
        `);
    },
};
