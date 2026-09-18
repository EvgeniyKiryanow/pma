import crypto from 'crypto';

import { AppError } from '../../shared/ipc/result';
import type {
    DocumentCategory,
    NewDocumentsInput,
    PersonDocument,
    RecentFile,
} from '../../shared/types/documents';
import type { DbProvider, Transactor } from '../db/types';
import type { HistoryAttachments } from '../personnel/HistoryAttachments';
import type { DocumentRepository, DocumentRow } from './DocumentRepository';

type FileStore = Pick<
    HistoryAttachments,
    'documentDir' | 'saveToDir' | 'readFromDir' | 'removeDir'
>;

const toDocument = (row: DocumentRow): PersonDocument => ({
    uuid: row.uuid,
    userId: row.user_id,
    categoryUuid: row.category_uuid,
    name: row.name,
    type: row.type,
    size: row.size,
    note: row.note,
    createdAt: row.created_at,
});

/** SQLite CURRENT_TIMESTAMP ("2026-09-19 10:00:00", UTC) → ISO. */
const isoOf = (value: string | null | undefined) =>
    !value ? '' : value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;

function name(value: unknown, field: string, maxLength = 200): string {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text || text.length > maxLength) throw new AppError('VALIDATION', undefined, { field });
    return text;
}

/**
 * The «Документи» of a person, sorted into categories the unit creates. Each file is its own
 * document: <data>/history_files/<person>/documents/<uuid>/<file>, encrypted like every
 * attachment and carried by full backups.
 */
export class DocumentService {
    constructor(
        private readonly transactor: Transactor,
        private readonly documents: DocumentRepository,
        private readonly files: FileStore,
        private readonly db: DbProvider,
    ) {}

    // ------------------------------------------------------------ categories

    async categories(userId?: number): Promise<DocumentCategory[]> {
        return (await this.documents.categories(userId)).map(({ uuid, name, sort, count }) => ({
            uuid,
            name,
            sort,
            count,
        }));
    }

    async addCategory(input: unknown): Promise<DocumentCategory> {
        const title = name(input, 'name', 80);
        const existing = (await this.documents.categories()).find(
            (c) => c.name.toLowerCase() === title.toLowerCase(),
        );
        if (existing) throw new AppError('CONFLICT', 'Category exists', { field: 'name' });
        const id = await this.documents.insertCategory(title);
        const row = (await this.documents.categories()).find((c) => c.id === id);
        if (!row) throw new AppError('INTERNAL');
        return { uuid: row.uuid, name: row.name, sort: row.sort, count: 0 };
    }

    async renameCategory(uuid: string, input: unknown): Promise<void> {
        if (!(await this.documents.categoryByUuid(uuid))) throw new AppError('NOT_FOUND');
        await this.documents.renameCategory(uuid, name(input, 'name', 80));
    }

    /** Only an empty category can go (CONFLICT with `count` otherwise). */
    async removeCategory(uuid: string): Promise<void> {
        await this.transactor.transaction(async () => {
            if (!(await this.documents.categoryByUuid(uuid))) throw new AppError('NOT_FOUND');
            const count = await this.documents.countInCategory(uuid);
            if (count) throw new AppError('CONFLICT', 'Category is not empty', { count });
            await this.documents.deleteCategory(uuid);
        });
    }

    // ------------------------------------------------------------ documents

    async list(userId: number): Promise<PersonDocument[]> {
        return (await this.documents.listFor(userId)).map(toDocument);
    }

    /**
     * Stores every file as a document of the category. Files are written first; if the rows
     * cannot be written they are removed again.
     */
    async add(input: NewDocumentsInput): Promise<PersonDocument[]> {
        if (!(await this.documents.userExists(input.userId))) throw new AppError('NOT_FOUND');
        if (input.categoryUuid && !(await this.documents.categoryByUuid(input.categoryUuid))) {
            throw new AppError('VALIDATION', undefined, { field: 'categoryUuid' });
        }
        const written: { uuid: string; dir: string; name: string; type: string; size: number }[] =
            [];
        try {
            for (const file of input.files) {
                if (!file?.dataUrl) throw new AppError('VALIDATION', undefined, { field: 'files' });
                const uuid = crypto.randomUUID();
                const dir = this.files.documentDir(input.userId, uuid);
                const [meta] = await this.files.saveToDir(dir, [file], `document ${uuid}`);
                written.push({
                    uuid,
                    dir,
                    name: meta.name,
                    type: file.type ?? '',
                    size: meta.size ?? 0,
                });
            }
            await this.transactor.transaction(async () => {
                for (const file of written) {
                    await this.documents.insert({
                        uuid: file.uuid,
                        user_id: input.userId,
                        category_uuid: input.categoryUuid,
                        name: file.name,
                        file_name: file.name,
                        type: file.type,
                        size: file.size,
                        note: String(input.note ?? '').slice(0, 2000),
                    });
                }
            });
        } catch (err) {
            for (const file of written) await this.files.removeDir(file.dir);
            throw err;
        }
        const all = await this.documents.listFor(input.userId);
        const added = new Set(written.map((file) => file.uuid));
        return all.filter((row) => added.has(row.uuid)).map(toDocument);
    }

    async update(
        uuid: string,
        patch: { name?: unknown; categoryUuid?: unknown; note?: unknown },
    ): Promise<PersonDocument> {
        const row = await this.documents.byUuid(uuid);
        if (!row) throw new AppError('NOT_FOUND');
        const categoryUuid =
            patch.categoryUuid === undefined
                ? row.category_uuid
                : patch.categoryUuid === null
                  ? null
                  : String(patch.categoryUuid);
        if (categoryUuid && !(await this.documents.categoryByUuid(categoryUuid))) {
            throw new AppError('VALIDATION', undefined, { field: 'categoryUuid' });
        }
        await this.documents.update(uuid, {
            name: patch.name === undefined ? row.name : name(patch.name, 'name', 200),
            category_uuid: categoryUuid,
            note: patch.note === undefined ? row.note : String(patch.note ?? '').slice(0, 2000),
        });
        return toDocument((await this.documents.byUuid(uuid))!);
    }

    async remove(uuid: string): Promise<void> {
        const row = await this.documents.byUuid(uuid);
        if (!row) throw new AppError('NOT_FOUND');
        await this.documents.delete(uuid);
        await this.files.removeDir(this.files.documentDir(row.user_id, uuid));
    }

    /** The content as a data URL; NOT_FOUND when the file is not on this computer. */
    async load(uuid: string): Promise<string> {
        const row = await this.documents.byUuid(uuid);
        if (!row) throw new AppError('NOT_FOUND');
        return this.files.readFromDir(this.files.documentDir(row.user_id, uuid), row.file_name);
    }

    // ------------------------------------------------------------ the desktop

    /** Files added lately anywhere: documents, history, reports, the journal. Newest first. */
    async recent(limit = 30): Promise<RecentFile[]> {
        const conn = await this.db();
        const files: RecentFile[] = (await this.documents.recent(limit)).map((row) => ({
            key: `document:${row.uuid}`,
            source: 'document',
            name: row.name,
            date: isoOf(row.created_at),
            userId: row.user_id,
            userName: row.full_name ?? undefined,
            context: row.category ?? undefined,
            ref: { documentUuid: row.uuid },
        }));

        const people = await conn.all<{ id: number; fullName: string; history: string }[]>(
            `SELECT id, fullName, history FROM users WHERE history LIKE '%"files":[{%'`,
        );
        for (const person of people) {
            let entries: {
                id: number;
                date: string;
                type?: string;
                description?: string;
                files?: { name: string }[];
            }[] = [];
            try {
                entries = JSON.parse(person.history || '[]');
            } catch {
                continue;
            }
            for (const entry of Array.isArray(entries) ? entries : []) {
                for (const file of Array.isArray(entry?.files) ? entry.files : []) {
                    if (!file?.name) continue;
                    files.push({
                        key: `history:${person.id}:${entry.id}:${file.name}`,
                        source: 'history',
                        name: file.name,
                        date: isoOf(entry.date),
                        userId: person.id,
                        userName: person.fullName,
                        context: entry.description?.slice(0, 120),
                        ref: { entryId: entry.id },
                    });
                }
            }
        }

        const reports = await conn.all<
            { id: number; name: string; filePath: string; createdAt: string; kind: string }[]
        >(
            `SELECT id, name, filePath, createdAt, kind FROM report_templates ORDER BY createdAt DESC LIMIT ?`,
            limit,
        );
        for (const report of reports) {
            files.push({
                key: `report:${report.id}`,
                source: 'report',
                name: report.name,
                date: isoOf(report.createdAt),
                context: report.kind === 'template' ? 'template' : 'report',
                ref: { filePath: report.filePath },
            });
        }

        const journal = await conn.all<
            { uuid: string; title: string; files: string; updated_at: string }[]
        >(`SELECT uuid, title, files, updated_at FROM journal_entries WHERE files <> '[]'`);
        for (const entry of journal) {
            let list: { name: string }[] = [];
            try {
                list = JSON.parse(entry.files || '[]');
            } catch {
                continue;
            }
            for (const file of Array.isArray(list) ? list : []) {
                if (!file?.name) continue;
                files.push({
                    key: `journal:${entry.uuid}:${file.name}`,
                    source: 'journal',
                    name: file.name,
                    date: isoOf(entry.updated_at),
                    context: entry.title,
                    ref: { journalUuid: entry.uuid },
                });
            }
        }

        return files
            .filter((file) => file.date)
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, limit);
    }
}
