import type { DataKeyring } from '../auth/DataKeyring';
import type { Logger } from '../core/logger';
import type { DataVault } from './DataVault';

/**
 * The sign-in side of the data key. When the data is locked at start (Windows could not open
 * the key), a successful password unlock opens the data set — the app then finishes its
 * start-up (`onUnlock`) before the sign-in itself continues.
 */
export class DataGate implements DataKeyring {
    private opener: (() => Promise<void>) | null = null;
    private opening: Promise<void> | null = null;

    constructor(
        private readonly vault: DataVault,
        private readonly logger: Logger,
    ) {}

    /** What to do once the data can be opened (open the database, run migrations…). */
    onUnlock(opener: () => Promise<void>): void {
        this.opener = opener;
    }

    isLocked(): boolean {
        return !this.vault.isUnlocked;
    }

    async unlock(username: string, password: string): Promise<boolean> {
        if (this.vault.isUnlocked) return true;
        if (!(await this.vault.unlockWithPassword(username, password))) return false;
        this.logger.warn('Data opened with a PManager password; Windows got a new copy of the key');
        // Two sign-ins at the same moment must not open the data twice.
        this.opening ??= (this.opener?.() ?? Promise.resolve()).finally(() => {
            this.opening = null;
        });
        await this.opening;
        return true;
    }

    remember(username: string, password: string): Promise<void> {
        return this.vault.rememberAccount(username, password);
    }

    forget(username: string): Promise<void> {
        return this.vault.forgetAccount(username);
    }
}
