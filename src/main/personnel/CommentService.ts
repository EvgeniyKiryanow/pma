import { AppError } from '../../shared/ipc/result';
import type { CommentOrHistoryEntry } from '../../shared/types/user';
import type { Transactor } from '../db/types';
import type { EntryListStore } from './EntryListStore';

/** Free-form comments on a person. */
export class CommentService {
    constructor(
        private readonly transactor: Transactor,
        private readonly comments: EntryListStore<CommentOrHistoryEntry>,
    ) {}

    async list(userId: number): Promise<CommentOrHistoryEntry[]> {
        return (await this.comments.read(userId)) ?? [];
    }

    /** Throws NOT_FOUND when the person does not exist. */
    async add(userId: number, comment: CommentOrHistoryEntry): Promise<void> {
        await this.transactor.transaction(async () => {
            const entries = await this.comments.read(userId);
            if (entries === null) throw new AppError('NOT_FOUND', 'User not found');
            entries.push(comment);
            await this.comments.write(userId, entries);
        });
    }

    /** Removes the comment with this id from everyone who has it. */
    async remove(commentId: number): Promise<void> {
        await this.transactor.transaction(async () => {
            for (const { userId, entries } of await this.comments.mayContain(commentId)) {
                const remaining = entries.filter((entry) => entry.id !== commentId);
                if (remaining.length !== entries.length)
                    await this.comments.write(userId, remaining);
            }
        });
    }
}
