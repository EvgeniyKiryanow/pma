import fs from 'fs/promises';
import mime from 'mime-types';

import type { CommentOrHistoryEntry } from '../../../shared/types/user';
import { database } from '../../db/connection';
import { historyEntryDir, historyFilePath, saveHistoryFiles } from '../../personnel/historyFiles';
import { parseUserRow, safeJsonArray } from '../../personnel/userFields';
import { access, handle } from '../secureHandle';
import { requireArray, requireInt, requireObject, requireString } from '../validate';
import { logChange } from './changeLog';

const FILTER_DAYS: Record<string, number> = {
    '1day': 1,
    '7days': 7,
    '14days': 14,
    '30days': 30,
    all: 100 * 365,
};

function filterFromDate(filter: string): Date {
    const date = new Date();
    date.setDate(date.getDate() - (FILTER_DAYS[filter] ?? 30));
    return date;
}

function fileMeta(files: CommentOrHistoryEntry['files']) {
    return (files || []).map((f: any) => ({ name: f.name, type: f.type, size: f.size }));
}

export function registertUserHistoryHandlers() {
    const view = access.any('personnel.view');
    const edit = access.any('history.edit');

    handle('history:get-user-history', view, async (_event, userIdInput: number, filterInput: string) => {
        const userId = requireInt(userIdInput, 'userId');
        const filter = requireString(filterInput, 'filter', { maxLength: 20, allowEmpty: true });
        const db = await database.get();
        const user = await db.get('SELECT history FROM users WHERE id = ?', userId);
        const history = safeJsonArray(user?.history) as CommentOrHistoryEntry[];
        const fromDate = filterFromDate(filter);
        return history.filter((entry) => new Date(entry.date) >= fromDate);
    });

    /** Personnel list without heavy history/comments JSON. */
    handle('fetch-users-metadata', view, async () => {
        const db = await database.get();
        const rows = await db.all('SELECT * FROM users');
        return rows.map((row: any) => {
            const { history: _history, comments: _comments, ...rest } = row;
            return parseUserRow(rest, ['relatives']);
        });
    });

    /** Status changes without an attached document or period (the red badge in the header). */
    handle('history:find-incomplete', view, async () => {
        const db = await database.get();
        const rows = await db.all('SELECT id, shpkNumber, history FROM users');
        const result: {
            userId: number;
            entryId: number;
            reason: 'missing_file' | 'missing_period' | 'missing_both';
        }[] = [];

        for (const row of rows) {
            const shpk = String(row.shpkNumber ?? '');
            if (shpk === 'excluded' || shpk.includes('order')) continue;
            for (const entry of safeJsonArray(row.history) as CommentOrHistoryEntry[]) {
                if (entry?.type !== 'statusChange') continue;
                const noFiles = !entry.files || entry.files.length === 0;
                const noPeriod = !entry.period;
                if (!noFiles && !noPeriod) continue;
                result.push({
                    userId: row.id,
                    entryId: entry.id,
                    reason:
                        noFiles && noPeriod
                            ? 'missing_both'
                            : noFiles
                              ? 'missing_file'
                              : 'missing_period',
                });
            }
        }
        return result;
    });

    handle('users:get-one', view, async (_event, userIdInput: number) => {
        const userId = requireInt(userIdInput, 'userId');
        const db = await database.get();
        const user = await db.get('SELECT * FROM users WHERE id = ?', userId);
        return user ? parseUserRow(user) : null;
    });

    handle(
        'history:load-file',
        view,
        async (_event, userIdInput: number, entryIdInput: number, filenameInput: string) => {
            const userId = requireInt(userIdInput, 'userId');
            const entryId = requireInt(entryIdInput, 'entryId');
            const filename = requireString(filenameInput, 'filename', { maxLength: 260 });
            try {
                const buffer = await fs.readFile(historyFilePath(userId, entryId, filename));
                const mimeType = mime.lookup(filename) || 'application/octet-stream';
                return { dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}` };
            } catch {
                throw new Error(`Файл не знайдено: ${filename}`);
            }
        },
    );

    handle(
        'history:getByUserAndRange',
        view,
        async (_event, userIdInput: number, range: '1d' | '7d' | '30d' | 'all') => {
            const userId = requireInt(userIdInput, 'userId');
            const db = await database.get();
            const user = await db.get('SELECT history FROM users WHERE id = ?', userId);
            const history = safeJsonArray(user?.history) as CommentOrHistoryEntry[];
            if (range === 'all') return history;

            const threshold = new Date();
            threshold.setDate(threshold.getDate() - (range === '1d' ? 1 : range === '7d' ? 7 : 30));
            return history.filter((entry) => new Date(entry.date) >= threshold);
        },
    );

    handle(
        'history:add-entry',
        edit,
        async (_event, userIdInput: number, newEntryInput: any) => {
            const userId = requireInt(userIdInput, 'userId');
            const newEntry = requireObject(newEntryInput, 'entry');
            requireInt(newEntry.id, 'entry.id');
            requireArray(newEntry.files ?? [], 'entry.files', { maxLength: 100 });

            const db = await database.get();
            const user = await db.get('SELECT history FROM users WHERE id = ?', userId);
            if (!user) return { success: false, message: 'User not found' };

            await saveHistoryFiles(userId, newEntry.id as number, (newEntry.files as any[]) || []);

            await database.transaction(async (tx) => {
                const current = await tx.get('SELECT history FROM users WHERE id = ?', userId);
                const history = safeJsonArray(current?.history);
                history.push({ ...newEntry, files: fileMeta(newEntry.files as any[]) });
                await tx.run(
                    'UPDATE users SET history = ? WHERE id = ?',
                    JSON.stringify(history),
                    userId,
                );
                await logChange(
                    tx,
                    'users',
                    userId,
                    'update',
                    await tx.get('SELECT * FROM users WHERE id = ?', userId),
                );
            });
            return { success: true };
        },
        { audit: 'history.add' },
    );

    handle(
        'history:edit-entry',
        edit,
        async (_event, userIdInput: number, updatedEntry: CommentOrHistoryEntry) => {
            const userId = requireInt(userIdInput, 'userId');
            requireObject(updatedEntry, 'entry');
            requireInt(updatedEntry?.id, 'entry.id');
            requireArray(updatedEntry?.files ?? [], 'entry.files', { maxLength: 100 });
            const db = await database.get();
            const user = await db.get('SELECT history FROM users WHERE id = ?', userId);
            if (!user) return { success: false, message: 'User not found' };

            const history = safeJsonArray(user.history) as CommentOrHistoryEntry[];
            const index = history.findIndex((h) => h.id === updatedEntry.id);
            if (index === -1) return { success: false, message: 'History entry not found' };

            const newFiles = updatedEntry.files || [];
            const newNames = new Set(newFiles.map((f: any) => f.name));
            for (const old of history[index].files || []) {
                if (newNames.has(old.name)) continue;
                await fs
                    .rm(historyFilePath(userId, updatedEntry.id, old.name), { force: true })
                    .catch((err) => console.warn('Failed to delete removed attachment', err));
            }
            await saveHistoryFiles(userId, updatedEntry.id, newFiles);

            await database.transaction(async (tx) => {
                const current = await tx.get('SELECT history FROM users WHERE id = ?', userId);
                const latest = safeJsonArray(current?.history) as CommentOrHistoryEntry[];
                const i = latest.findIndex((h) => h.id === updatedEntry.id);
                if (i === -1) return;
                latest[i] = { ...updatedEntry, files: fileMeta(newFiles) };
                await tx.run(
                    'UPDATE users SET history = ? WHERE id = ?',
                    JSON.stringify(latest),
                    userId,
                );
                await logChange(
                    tx,
                    'users',
                    userId,
                    'update',
                    await tx.get('SELECT * FROM users WHERE id = ?', userId),
                );
            });
            return { success: true };
        },
        { audit: 'history.edit' },
    );

    handle(
        'deleteUserHistory',
        edit,
        async (_event, historyIdInput: number) => {
            const historyId = requireInt(historyIdInput, 'historyId');
            const db = await database.get();
            const users = await db.all('SELECT id, history FROM users');

            for (const user of users) {
                const history = safeJsonArray(user.history) as CommentOrHistoryEntry[];
                if (!history.some((h) => h.id === historyId)) continue;

                await database.transaction(async (tx) => {
                    const remaining = history.filter((item) => item.id !== historyId);
                    await tx.run(
                        'UPDATE users SET history = ? WHERE id = ?',
                        JSON.stringify(remaining),
                        user.id,
                    );
                    await logChange(
                        tx,
                        'users',
                        user.id,
                        'update',
                        await tx.get('SELECT * FROM users WHERE id = ?', user.id),
                    );
                });
                await fs
                    .rm(historyEntryDir(user.id, historyId), { recursive: true, force: true })
                    .catch((err) =>
                        console.warn('Failed to delete attachments of history entry', err),
                    );

                return { success: true, deletedFromUserId: user.id };
            }
            return { success: false, message: 'History entry not found in any user' };
        },
        { audit: 'history.delete' },
    );
}
