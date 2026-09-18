import type { User } from '../../../shared/types/user';
import { reportError } from '../api/errors';

/**
 * Changes of a person other screens react to without being imported by the screens that make
 * them: the card, the БЧС and the history window announce a status change, the named list
 * (табель) updates today's mark. Listeners are installed once by the app.
 */

export type StatusChange = {
    user: Pick<User, 'id' | 'fullName' | 'rank' | 'shpkNumber'>;
    from: string;
    to: string;
};

type Listener = (change: StatusChange) => void | Promise<void>;

const listeners = new Set<Listener>();

export const personnelEvents = {
    onStatusChange(listener: Listener): () => void {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    /** Never throws: a failing listener is reported, the change itself is already saved. */
    async statusChanged(change: StatusChange): Promise<void> {
        if ((change.from || '') === (change.to || '')) return;
        for (const listener of listeners) {
            try {
                await listener(change);
            } catch (error) {
                reportError(error, { context: 'status-change-listener' });
            }
        }
    },
};
