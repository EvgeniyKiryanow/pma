import type { WebContents } from 'electron';
import { shell } from 'electron';

import type { AutoBackupSettings, BackupSettings, ResetOptions } from '../../shared/backup/types';
import { BACKUP_CHANNELS } from '../../shared/ipc/channels';
import { AppError } from '../../shared/ipc/result';
import type { KeptAccount } from '../auth/services/AccountService';
import { chooseOpenFile, chooseSavePath } from '../core/dialogs';
import type { JsonStore } from '../core/JsonStore';
import { AppPaths } from '../core/paths';
import { access, handleResult } from '../ipc/secureHandle';
import type { AutoBackupScheduler } from './AutoBackupScheduler';
import type { BackupService } from './BackupService';
import type { Uninstaller } from './Uninstaller';

type Deps = {
    backups: BackupService;
    settings: JsonStore<BackupSettings>;
    scheduler: AutoBackupScheduler;
    hasAccounts: () => Promise<boolean>;
    /** The signed-in account of the window (null on a fresh install: nobody to keep). */
    accountToKeep: (sender: WebContents) => Promise<KeptAccount | null>;
    uninstaller: Uninstaller;
};

function defaultBackupName(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    return `pmanager-backup_${stamp}.pmb`;
}

function sanitizeAutoBackup(input: Partial<AutoBackupSettings>): Partial<AutoBackupSettings> {
    const result: Partial<AutoBackupSettings> = {};
    if (input.enabled !== undefined) result.enabled = Boolean(input.enabled);
    if (input.intervalDays !== undefined) {
        const days = Number(input.intervalDays);
        if (!Number.isInteger(days) || days < 1 || days > 90)
            throw new AppError('VALIDATION', undefined, { field: 'intervalDays' });
        result.intervalDays = days;
    }
    if (input.keep !== undefined) {
        const keep = Number(input.keep);
        if (!Number.isInteger(keep) || keep < 1 || keep > 100)
            throw new AppError('VALIDATION', undefined, { field: 'keep' });
        result.keep = keep;
    }
    return result;
}

export function registerBackupIpc({
    backups,
    settings,
    scheduler,
    hasAccounts,
    accountToKeep,
    uninstaller,
}: Deps): void {
    // Restoring is also allowed on a fresh install (no accounts yet), so a new computer can be
    // set up straight from a backup without creating a throwaway administrator first.
    const canImport = access.custom(
        async (session) =>
            (session !== null &&
                !session.mustChangePassword &&
                session.permissionSet.has('backup.import')) ||
            !(await hasAccounts()),
    );

    handleResult(
        BACKUP_CHANNELS.exportPackage,
        access.any('backup.export'),
        async (event, password: string) => {
            const filePath = await chooseSavePath(event.sender, {
                title: 'Зберегти резервну копію',
                defaultPath: defaultBackupName(),
                filters: [{ name: 'Резервна копія PManager', extensions: ['pmb'] }],
            });
            if (!filePath) throw new AppError('CANCELED');
            return backups.exportPackage(filePath, password);
        },
        { audit: 'backup.export' },
    );

    handleResult(BACKUP_CHANNELS.selectImportFile, canImport, async (event) => {
        const filePath = await chooseOpenFile(event.sender, {
            title: 'Оберіть резервну копію',
            filters: [
                { name: 'Резервні копії', extensions: ['pmb', 'sqlite', 'db'] },
                { name: 'Усі файли', extensions: ['*'] },
            ],
        });
        if (!filePath) throw new AppError('CANCELED');
        return backups.selectImport(event.sender.id, filePath);
    });

    handleResult(BACKUP_CHANNELS.inspect, canImport, async (event, password: string) => {
        const inspection = await backups.inspectImport(event.sender.id, password);
        const keep = await accountToKeep(event.sender);
        return { ...inspection, keepsAccount: keep?.username ?? null };
    });

    handleResult(
        BACKUP_CHANNELS.restore,
        canImport,
        async (event) =>
            backups.restoreImport(event.sender.id, {
                keepAccount: await accountToKeep(event.sender),
            }),
        { audit: 'backup.restore' },
    );

    handleResult(BACKUP_CHANNELS.getSettings, access.any('backup.export', 'backup.import'), () =>
        settings.read(),
    );

    handleResult(
        BACKUP_CHANNELS.updateSettings,
        access.any('backup.export'),
        async (_event, patch: Partial<AutoBackupSettings>) => {
            const next = await settings.update({ autoBackup: sanitizeAutoBackup(patch ?? {}) });
            void scheduler.tick();
            return next;
        },
        { audit: 'backup.update-settings' },
    );

    handleResult(BACKUP_CHANNELS.listSnapshots, access.any('backup.export', 'backup.import'), () =>
        backups.listSnapshots(),
    );

    handleResult(
        BACKUP_CHANNELS.createSnapshot,
        access.any('backup.export'),
        async () => {
            const { autoBackup } = await settings.read();
            return backups.createAutoSnapshot(autoBackup.keep);
        },
        { audit: 'backup.create-snapshot' },
    );

    handleResult(
        BACKUP_CHANNELS.openBackupsFolder,
        access.any('backup.export', 'backup.import'),
        async () => {
            const error = await shell.openPath(AppPaths.backupsRoot);
            if (error) throw new AppError('NOT_FOUND', error);
        },
    );

    handleResult(
        BACKUP_CHANNELS.resetAll,
        access.any('system.reset'),
        (_event, options: unknown) =>
            backups.resetAll({
                destroyLocalCopies: Boolean(
                    options &&
                        typeof options === 'object' &&
                        (options as ResetOptions).destroyLocalCopies === true,
                ),
            }),
        { audit: 'system.reset-all' },
    );

    handleResult(BACKUP_CHANNELS.canUninstall, access.any('system.reset'), () =>
        uninstaller.available(),
    );

    // Everything is destroyed the same way as «Очищення» with local copies; the uninstaller
    // then removes the program, its shortcuts and the (now empty) data folder.
    handleResult(
        BACKUP_CHANNELS.uninstall,
        access.any('system.reset'),
        async () => {
            if (!uninstaller.available()) {
                throw new AppError('VALIDATION', 'Програму встановлено не інсталятором');
            }
            await backups.resetAll({ destroyLocalCopies: true });
            uninstaller.start();
        },
        { audit: 'system.uninstall' },
    );
}
