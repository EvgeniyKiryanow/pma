import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DatabaseManager } from '../../src/main/db/connection';
import { migrationRunner } from '../../src/main/db/migrations';
import { PersonnelRepository } from '../../src/main/personnel/PersonnelRepository';
import { PersonnelService } from '../../src/main/personnel/PersonnelService';
import { PhotoThumbnails } from '../../src/main/personnel/PhotoThumbnails';
import { ChangeJournal } from '../../src/main/sync/ChangeJournal';

/**
 * The personnel list is read on every screen: it carries a small copy of each photo, never
 * the photo. Saving a person taken from the list keeps the photo; older photos get their
 * small copy in the background.
 */

const silent = { debug() {}, info() {}, warn() {}, error() {} };
const BIG = `data:image/jpeg;base64,${'A'.repeat(500_000)}`;

let dir: string;
let database: DatabaseManager;
let people: PersonnelRepository;
let personnel: PersonnelService;

beforeEach(async () => {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pma-photos-'));
    database = new DatabaseManager(() => path.join(dir, 'users.db'));
    await migrationRunner.run(await database.get());
    const db = () => database.get();
    people = new PersonnelRepository(db);
    personnel = new PersonnelService(database, people, new ChangeJournal(db));
});

afterEach(async () => {
    await database.close();
    await fsp.rm(dir, { recursive: true, force: true });
});

const shrinker = (calls: string[] = []) =>
    new PhotoThumbnails(
        people,
        (photo) => {
            calls.push(photo);
            return photo === 'data:broken' ? null : { photo: 'data:small', thumb: 'data:thumb' };
        },
        silent,
        async () => undefined,
    );

describe('photos', () => {
    it('the list carries the small copy, the card the photo', async () => {
        const { id } = await personnel.create({
            fullName: 'Фото',
            photo: BIG,
            photoThumb: 'data:t',
        });
        const [listed] = await personnel.list();
        expect(listed).not.toHaveProperty('photo');
        expect(listed.photoThumb).toBe('data:t');
        expect((await personnel.getOne(id))!.photo).toBe(BIG);
    });

    it('saving a person from the list keeps the photo and its small copy', async () => {
        const { id } = await personnel.create({
            fullName: 'Фото',
            photo: BIG,
            photoThumb: 'data:t',
        });
        const [listed] = await personnel.list();
        await personnel.update(id, { ...listed, rank: 'сержант' });
        const saved = await personnel.getOne(id);
        expect(saved).toMatchObject({ rank: 'сержант', photo: BIG, photoThumb: 'data:t' });
    });

    it('a new photo without a small copy gets one later; the same photo keeps it', async () => {
        const { id } = await personnel.create({
            fullName: 'Фото',
            photo: BIG,
            photoThumb: 'data:t',
        });
        const card = (await personnel.getOne(id))!;
        await personnel.update(id, { ...card, photoThumb: undefined, notes: 'x' } as never);
        expect((await personnel.getOne(id))!.photoThumb).toBe('data:t');
        const { photoThumb: _thumb, ...withoutThumb } = card;
        await personnel.update(id, { ...withoutThumb, photo: 'data:new' });
        expect((await personnel.getOne(id))!.photoThumb).toBeNull();
    });

    it('older photos get a small copy and shrink, once', async () => {
        const a = await personnel.create({ fullName: 'А', photo: BIG });
        const b = await personnel.create({ fullName: 'Б', photo: 'data:broken' });
        await personnel.create({ fullName: 'В' });
        const calls: string[] = [];
        expect(await shrinker(calls).run()).toBe(1);
        expect(await personnel.getOne(a.id)).toMatchObject({
            photo: 'data:small',
            photoThumb: 'data:thumb',
        });
        // An unreadable photo stays as it is and is not tried again in the same pass.
        expect((await personnel.getOne(b.id))!.photo).toBe('data:broken');
        expect(calls).toEqual([BIG, 'data:broken']);
        expect(await shrinker().run()).toBe(0);
    });

    it('never overwrites a photo changed while it was being shrunk', async () => {
        const { id } = await personnel.create({ fullName: 'А', photo: BIG });
        expect(await people.replacePhoto(id, 'data:other', 'data:small', 'data:thumb')).toBe(false);
        expect((await personnel.getOne(id))!.photo).toBe(BIG);
    });
});
