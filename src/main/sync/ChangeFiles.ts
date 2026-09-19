import type { Logger } from '../core/logger';
import type { Db } from '../db/types';
import type { HistoryAttachments } from '../personnel/HistoryAttachments';
import type { ChangeFile, ChangeRow } from './ChangeJournal';
import type { SentFile, SentFiles } from './SentFiles';

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
const namedFiles = (files: unknown): { name: string; size?: unknown }[] =>
    list(files).filter((f: Named) => typeof f.name === 'string' && f.name) as {
        name: string;
        size?: unknown;
    }[];
const names = (files: unknown): string[] => namedFiles(files).map((f) => f.name);

type WantedFile = {
    kind: ChangeFile['kind'];
    key: string;
    dir: string;
    name: string;
    /** Set for files of a person: remembered once a change log carried them. */
    sent?: SentFile;
};

export type AttachOptions = {
    /** Characters of file content one change log may carry. */
    budget?: number;
    /** Files earlier change logs carried. */
    sent?: Pick<SentFiles, 'has'>;
};

export type Attached = {
    /** The changes to write, in order: the journal from its start. */
    rows: ChangeRow[];
    /** Files of people these rows carry for the first time. */
    sent: SentFile[];
    /** The last row carries only part of its files: it stays in the journal. */
    incomplete: boolean;
};

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

    /**
     * The changes to write with their files; only the last change of a record carries them.
     *
     * Files of people (history, awards) that an earlier change log carried are not sent again.
     * One change log carries at most `budget` characters of file content: when the files do
     * not fit, the log ends there and the rest goes into the next one — the change whose
     * files were cut stays in the journal (`incomplete`), so none of them is lost.
     */
    async attach(changes: ChangeRow[], options: AttachOptions = {}): Promise<Attached> {
        const budget = options.budget ?? Number.POSITIVE_INFINITY;
        const last = new Map<string, number>();
        changes.forEach((change, index) => {
            const data = parse(change.data) as Record<string, any> | null;
            if (change.operation !== 'delete' && data?.uuid) {
                last.set(`${change.table_name}:${data.uuid}`, index);
            }
        });
        const rows: ChangeRow[] = [];
        const sent: SentFile[] = [];
        let used = 0;
        for (const [index, change] of changes.entries()) {
            const data = parse(change.data) as Record<string, any> | null;
            if (!data?.uuid || last.get(`${change.table_name}:${data.uuid}`) !== index) {
                rows.push(change);
                continue;
            }
            const files: ChangeFile[] = [];
            const carried: SentFile[] = [];
            let cut = false;
            for (const file of this.wanted(change.table_name, data)) {
                if (file.sent && (await options.sent?.has(file.sent))) continue;
                let dataUrl: string;
                try {
                    dataUrl = await this.files.readFromDir(file.dir, file.name);
                } catch {
                    // Not on this computer (it came by an exchange without its files).
                    continue;
                }
                // The first file always goes, however big: otherwise nothing ever would.
                if (used + dataUrl.length > budget && (rows.length > 0 || files.length > 0)) {
                    cut = true;
                    break;
                }
                used += dataUrl.length;
                files.push({ kind: file.kind, key: file.key, name: file.name, dataUrl });
                if (file.sent) carried.push(file.sent);
            }
            if (cut && !files.length) return { rows, sent, incomplete: false };
            rows.push(files.length ? { ...change, files } : change);
            sent.push(...carried);
            if (cut) return { rows, sent, incomplete: true };
        }
        return { rows, sent, incomplete: false };
    }

    /** The files a change carries, where they are on this computer. */
    private wanted(table: string, data: Record<string, any>): WantedFile[] {
        const wanted: WantedFile[] = [];
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
            const person = (
                kind: SentFile['kind'],
                key: string,
                file: Named & { size?: unknown },
            ) => ({
                owner: String(data.uuid),
                kind,
                key,
                name: String(file.name),
                size: Number.isInteger(file.size) ? Number(file.size) : -1,
            });
            for (const record of list(data.awardRecords)) {
                if (typeof record.id !== 'string' || !/^[\w-]{1,64}$/.test(record.id)) continue;
                for (const file of namedFiles(record.files)) {
                    wanted.push({
                        kind: 'award',
                        key: record.id,
                        dir: this.files.awardDir(data.id, record.id),
                        name: file.name,
                        sent: person('award', record.id, file),
                    });
                }
            }
            for (const entry of list(data.history)) {
                if (!Number.isInteger(entry.id)) continue;
                for (const file of namedFiles(entry.files)) {
                    wanted.push({
                        kind: 'history',
                        key: String(entry.id),
                        dir: this.files.entryDir(data.id, entry.id),
                        name: file.name,
                        sent: person('history', String(entry.id), file),
                    });
                }
            }
        }
        return wanted;
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
