import type { BackupSettings } from '../../shared/backup/types';
import type { JsonStore } from '../core/JsonStore';
import type { Logger } from '../core/logger';
import type { BackupService } from './BackupService';

const CHECK_EVERY_MS = 60 * 60 * 1000;
const FIRST_CHECK_DELAY_MS = 2 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Local database snapshots on a schedule. Catches up on start if the app was closed when due. */
export class AutoBackupScheduler {
    private timer: NodeJS.Timeout | null = null;
    private running = false;

    constructor(
        private readonly backups: BackupService,
        private readonly settings: JsonStore<BackupSettings>,
        private readonly hasData: () => Promise<boolean>,
        private readonly logger: Logger,
    ) {}

    start(): void {
        this.stop();
        setTimeout(() => void this.tick(), FIRST_CHECK_DELAY_MS).unref();
        this.timer = setInterval(() => void this.tick(), CHECK_EVERY_MS);
        this.timer.unref();
    }

    stop(): void {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    async tick(): Promise<void> {
        if (this.running) return;
        this.running = true;
        try {
            const { autoBackup, lastAutoBackupAt } = await this.settings.read();
            if (!autoBackup.enabled || !(await this.hasData())) return;
            const last = lastAutoBackupAt ? Date.parse(lastAutoBackupAt) : 0;
            if (Date.now() - last < autoBackup.intervalDays * DAY_MS) return;

            await this.backups.createAutoSnapshot(autoBackup.keep);
            await this.settings.update({ lastAutoBackupAt: new Date().toISOString() });
        } catch (err) {
            this.logger.error('Automatic snapshot failed', err);
        } finally {
            this.running = false;
        }
    }
}
