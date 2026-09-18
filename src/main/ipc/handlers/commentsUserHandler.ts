import { database } from '../../db/connection';
import { safeJsonArray } from '../../personnel/userFields';
import { access, handle } from '../secureHandle';
import { requireInt, requireObject } from '../validate';
import { logChange } from './changeLog';

export function registerCommentsHandlers() {
    handle(
        'comments:get-user-comments',
        access.any('personnel.view'),
        async (_event, userIdInput: number) => {
            const userId = requireInt(userIdInput, 'userId');
            const db = await database.get();
            const user = await db.get('SELECT comments FROM users WHERE id = ?', userId);
            return safeJsonArray(user?.comments);
        },
    );

    handle(
        'comments:add-user-comment',
        access.any('history.edit'),
        async (_event, userIdInput: number, newCommentInput: any) => {
            const userId = requireInt(userIdInput, 'userId');
            const newComment = requireObject(newCommentInput, 'comment');
            requireInt(newComment.id, 'comment.id');
            return database.transaction(async (db) => {
                const user = await db.get('SELECT comments FROM users WHERE id = ?', userId);
                if (!user) return { success: false, message: 'User not found' };

                const comments = safeJsonArray(user.comments);
                comments.push(newComment);
                await db.run(
                    'UPDATE users SET comments = ? WHERE id = ?',
                    JSON.stringify(comments),
                    userId,
                );
                await logChange(
                    db,
                    'users',
                    userId,
                    'update',
                    await db.get('SELECT * FROM users WHERE id = ?', userId),
                );
                return { success: true };
            });
        },
        { audit: 'comments.add' },
    );

    handle(
        'comments:delete-user-comment',
        access.any('history.edit'),
        async (_event, idInput: number) => {
            const id = requireInt(idInput, 'id');
            return database.transaction(async (db) => {
                const users = await db.all('SELECT id, comments FROM users');
                for (const user of users) {
                    const comments = safeJsonArray(user.comments) as { id: number }[];
                    const remaining = comments.filter((entry) => entry.id !== id);
                    if (remaining.length === comments.length) continue;

                    await db.run(
                        'UPDATE users SET comments = ? WHERE id = ?',
                        JSON.stringify(remaining),
                        user.id,
                    );
                    await logChange(
                        db,
                        'users',
                        user.id,
                        'update',
                        await db.get('SELECT * FROM users WHERE id = ?', user.id),
                    );
                }
                return true;
            });
        },
        { audit: 'comments.delete' },
    );
}
