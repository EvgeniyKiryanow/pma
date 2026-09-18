import type { Logger } from '../core/logger';
import type { Db } from '../db/types';
import type { HistoryAttachments } from '../personnel/HistoryAttachments';
import type { ChangeFile, ChangeRow } from './ChangeJournal';

type FileStore = Pick<
    HistoryAttachments,
    | 'documentDir'
    | 'journalDir'
    | 'awardDir'
    | 'entryDir'
    | 'readFromDir'
    | 'saveToDir'
    | 'removeDir'
>;

type Named = { name?: unknown };

const parse = (value: unknown): unknown => {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};
const list = (value: unknown): Record<string, any>[] => {
    const parsed = parse(value);
    return Array.isArray(parsed) ? parsed.filter((x) => x && typeof x === 'object') : [];
};
const names = (files: unknown): string[] =>
    list(files)
        .map((f: Named) => (typeof f.name === 'string' ? f.name : ''))
        .filter(Boolean);

/**
 * Files travel with the change log: documents of people, files of journal entries, of awards
 * and of history entries. On export the content is read (decrypted) from this computer; on
 * import it is written (encrypted with this computer's key) into the folders of the local
 * person — local ids differ between computers, so the person is found by uuid.
 */
export class ChangeFiles {
    constructor(
        private readonly files: FileStore,
        private readonly logger: Logger,
    ) {}

    /** The changes with their files; only the last change of a record carries them. */
    async attach(changes: ChangeRow[]): Promise<ChangeRow[]> {
        const last = new Map<string, number>();
        changes.forEach((change, index) => {
            const data = parse(change.data) as Record<string, any> | null;
            if (change.operation !== 'delete' && data?.uuid) {
                last.set(`${change.table_name}:${data.uuid}`, index);
            }
        });
        const result: ChangeRow[] = [];
        for (const [index, change] of changes.entries()) {
            const data = parse(change.data) as Record<string, any> | null;
            if (!data?.uuid || last.get(`${change.table_name}:${data.uuid}`) !== index) {
                result.push(change);
                continue;
            }
            const files = await this.read(change.table_name, data);
            result.push(files.length ? { ...change, files } : change);
        }
        return result;
    }

    private async read(table: string, data: Record<string, any>): Promise<ChangeFile[]> {
        const wanted: { kind: ChangeFile['kind']; key: string; dir: string; name: string }[] = [];
        if (table === 'person_documents' && data.user_id && data.file_name) {
            wanted.push({
                kind: 'document',
                key: data.uuid,
                dir: this.files.documentDir(data.user_id, data.uuid),
                name: data.file_name,
            });
        }
        if (table === 'journal_entries') {
            for (const name of names(data.files)) {
                wanted.push({
                    kind: 'journal',
                    key: data.uuid,
                    dir: this.files.journalDir(data.uuid),
                    name,
                });
            }
        }
        if (table === 'users' && data.id) {
            for (const record of list(data.awardRecords)) {
                if (typeof record.id !== 'string' || !/^[\w-]{1,64}$/.test(record.id)) continue;
                for (const name of names(record.files)) {
                    wanted.push({
                        kind: 'award',
                        key: record.id,
                        dir: this.files.awardDir(data.id, record.id),
                        name,
                    });
                }
            }
            for (const entry of list(data.history)) {
                if (!Number.isInteger(entry.id)) continue;
                for (const name of names(entry.files)) {
                    wanted.push({
                        kind: 'history',
                        key: String(entry.id),
                        dir: this.files.entryDir(data.id, entry.id),
                        name,
                    });
                }
            }
        }
        const result: ChangeFile[] = [];
        for (const file of wanted) {
            try {
                result.push({
                    kind: file.kind,
                    key: file.key,
                    name: file.name,
                    dataUrl: await this.files.readFromDir(file.dir, file.name),
                });
            } catch {
                // Not on this computer (it came by an exchange without its files): nothing to send.
            }
        }
        return result;
    }

    /** After a change is applied: its files go into place; a deleted record takes its folder. */
    async restore(db: Db, change: ChangeRow): Promise<void> {
        const data = parse(change.data) as Record<string, any> | null;
        if (!data?.uuid) return;
        const table = change.table_name;

        if (change.operation === 'delete') {
            if (table === 'journal_entries')
                await this.files.removeDir(this.files.journalDir(data.uuid));
            if (table === 'person_documents') {
                const owner = data.user_uuid
                    ? await db.get<{ id: number }>(
                          `SELECT id FROM users WHERE uuid = ?`,
                          data.user_uuid,
                      )
                    : undefined;
                if (owner) await this.files.removeDir(this.files.documentDir(owner.id, data.uuid));
            }
            return;
        }
        if (!change.files?.length) return;

        let personId: number | undefined;
        if (table === 'users') {
            personId = (
                await db.get<{ id: number }>(`SELECT id FROM users WHERE uuid = ?`, data.uuid)
            )?.id;
        } else if (data.user_uuid) {
            personId = (
                await db.get<{ id: number }>(`SELECT id FROM users WHERE uuid = ?`, data.user_uuid)
            )?.id;
        }

        for (const file of change.files) {
            if (!file?.dataUrl || !file.name) continue;
            let dir: string | null = null;
            if (file.kind === 'journal' && table === 'journal_entries')
                dir = this.files.journalDir(data.uuid);
            if (file.kind === 'document' && table === 'person_documents' && personId) {
                dir = this.files.documentDir(personId, data.uuid);
            }
            if (
                file.kind === 'award' &&
                table === 'users' &&
                personId &&
                /^[\w-]{1,64}$/.test(file.key)
            ) {
                dir = this.files.awardDir(personId, file.key);
            }
            if (
                file.kind === 'history' &&
                table === 'users' &&
                personId &&
                /^\d+$/.test(file.key)
            ) {
                dir = this.files.entryDir(personId, Number(file.key));
            }
            if (!dir) continue;
            try {
                await this.files.saveToDir(
                    dir,
                    [{ name: file.name, dataUrl: file.dataUrl }],
                    `imported ${file.kind}`,
                );
            } catch (err) {
                this.logger.warn(`An imported ${file.kind} file could not be written`, err);
            }
        }
    }
}
