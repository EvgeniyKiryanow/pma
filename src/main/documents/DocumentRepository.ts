import type { DbProvider } from '../db/types';

export type CategoryRow = { id: number; uuid: string; name: string; sort: number; count: number };

export type DocumentRow = {
    id: number;
    uuid: string;
    user_id: number;
    category_uuid: string | null;
    name: string;
    file_name: string;
    type: string;
    size: number;
    note: string;
    created_at: string;
};

/** SQL of the documents of people and their categories. */
export class DocumentRepository {
    constructor(private readonly db: DbProvider) {}

    async categories(userId?: number): Promise<CategoryRow[]> {
        return (await this.db()).all<CategoryRow[]>(
            `SELECT c.id, c.uuid, c.name, c.sort,
                    (SELECT COUNT(*) FROM person_documents d
                      WHERE d.category_uuid = c.uuid AND (? IS NULL OR d.user_id = ?)) AS count
             FROM document_categories c ORDER BY c.sort, c.name COLLATE NOCASE`,
            userId ?? null,
            userId ?? null,
        );
    }

    async categoryByUuid(uuid: string): Promise<CategoryRow | undefined> {
        return (await this.db()).get<CategoryRow>(
            `SELECT id, uuid, name, sort, 0 AS count FROM document_categories WHERE uuid = ?`,
            uuid,
        );
    }

    async insertCategory(name: string): Promise<number> {
        const conn = await this.db();
        const next = await conn.get<{ n: number }>(
            'SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM document_categories',
        );
        const result = await conn.run(
            'INSERT INTO document_categories (name, sort) VALUES (?, ?)',
            name,
            next?.n ?? 0,
        );
        return Number(result.lastID);
    }

    async renameCategory(uuid: string, name: string): Promise<void> {
        await (
            await this.db()
        ).run('UPDATE document_categories SET name = ? WHERE uuid = ?', name, uuid);
    }

    async deleteCategory(uuid: string): Promise<void> {
        await (await this.db()).run('DELETE FROM document_categories WHERE uuid = ?', uuid);
    }

    async countInCategory(uuid: string): Promise<number> {
        const row = await (
            await this.db()
        ).get<{ n: number }>(
            'SELECT COUNT(*) AS n FROM person_documents WHERE category_uuid = ?',
            uuid,
        );
        return row?.n ?? 0;
    }

    async listFor(userId: number): Promise<DocumentRow[]> {
        return (await this.db()).all<DocumentRow[]>(
            'SELECT * FROM person_documents WHERE user_id = ? ORDER BY created_at DESC, id DESC',
            userId,
        );
    }

    async recent(
        limit: number,
    ): Promise<(DocumentRow & { full_name: string | null; category: string | null })[]> {
        return (await this.db()).all(
            `SELECT d.*, u.fullName AS full_name, c.name AS category
             FROM person_documents d
             LEFT JOIN users u ON u.id = d.user_id
             LEFT JOIN document_categories c ON c.uuid = d.category_uuid
             ORDER BY d.created_at DESC, d.id DESC LIMIT ?`,
            limit,
        );
    }

    async byUuid(uuid: string): Promise<DocumentRow | undefined> {
        return (await this.db()).get<DocumentRow>(
            'SELECT * FROM person_documents WHERE uuid = ?',
            uuid,
        );
    }

    async insert(
        doc: Omit<DocumentRow, 'id' | 'uuid' | 'created_at'> & { uuid: string },
    ): Promise<void> {
        await (
            await this.db()
        ).run(
            `INSERT INTO person_documents (uuid, user_id, category_uuid, name, file_name, type, size, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            doc.uuid,
            doc.user_id,
            doc.category_uuid,
            doc.name,
            doc.file_name,
            doc.type,
            doc.size,
            doc.note,
        );
    }

    async update(
        uuid: string,
        patch: { name: string; category_uuid: string | null; note: string },
    ) {
        await (
            await this.db()
        ).run(
            'UPDATE person_documents SET name = ?, category_uuid = ?, note = ? WHERE uuid = ?',
            patch.name,
            patch.category_uuid,
            patch.note,
            uuid,
        );
    }

    async delete(uuid: string): Promise<void> {
        await (await this.db()).run('DELETE FROM person_documents WHERE uuid = ?', uuid);
    }

    async userExists(userId: number): Promise<boolean> {
        return Boolean(await (await this.db()).get('SELECT 1 FROM users WHERE id = ?', userId));
    }
}
