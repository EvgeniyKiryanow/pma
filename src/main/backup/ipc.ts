import type { WebContents } from 'electron';
import { shell } from 'electron';

import type { SessionInfo, SetupInput } from '../../shared/auth/types';
import {
    type AutoBackupSettings,
    BACKUP_REMINDER_OPTIONS,
    type BackupSettings,
    type BackupSettingsPatch,
    type ResetOptions,
    RestoreRequest,
} from '../../shared/backup/types';
import { BACKUP_CHANNELS } from '../../shared/ipc/channels';
import { AppError } from '../../shared/ipc/result';
import type { KeptAccount } from '../auth/services/AccountService';
import { chooseOpenFile, chooseSavePath } from '../core/dialogs';
import type { JsonStore } from '../core/JsonStore';
import { AppPaths } from '../core/paths';
import { access, handleResult } from '../ipc/secureHandle';
import type { AutoBackupScheduler } from './AutoBackupScheduler';
import type { BackupService } from './BackupService';
import { openedBackupFile } from './openedFile';
import type { Uninstaller } from './Uninstaller';

type Deps = {
    backups: BackupService;
    settings: JsonStore<BackupSettings>;
    scheduler: AutoBackupScheduler;
    /** The signed-in account of the window (null on a fresh install: nobody to keep). */
    accountToKeep: (sender: WebContents) => Promise<KeptAccount | null>;
    newAdministrator: (input: { username?: unknown; password?: unknown }) => Promise<KeptAccount>;
    /** Refuses what the first-run setup would refuse (before anything is moved). */
    checkSetup: (input: SetupInput) => void;
    /** First-run setup on the empty data set: creates the administrator and signs them in. */
    setup: (
        sender: WebContents,
        input: SetupInput,
    ) => Promise<{ session: SessionInfo; recoveryCode: string }>;
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
    accountToKeep,
    newAdministrator,
    checkSetup,
    setup,
    uninstaller,
}: Deps): void {
    // Restoring is also allowed from the sign-in screen (nobody signed in), so a new computer
    // is set up straight from a backup, and a unit whose passwords are all forgotten gets its
    // data back. The backup password is the proof: whoever has it can read the copy anyway.
    // The data replaced is only moved into a safety copy, never shown to the one restoring.
    const canImport = access.custom(
        (session) =>
            session === null ||
            (!session.mustChangePassword && session.permissionSet.has('backup.import')),
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
            const result = await backups.exportPackage(filePath, password);
            // For the reminder «остання повна копія N днів тому».
            await settings.update({ lastFullBackupAt: new Date().toISOString() });
            return result;
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

    // A .pmb file opened with the program (double-click in Explorer): its name for the
    // screen, then the same selection as a file chosen in the dialog.
    handleResult(BACKUP_CHANNELS.openedFile, access.public, () => openedBackupFile.name());

    handleResult(BACKUP_CHANNELS.selectOpenedFile, canImport, async (event) => {
        const filePath = openedBackupFile.take();
        if (!filePath) throw new AppError('NOTHING_SELECTED');
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
        async (event, request?: RestoreRequest) => {
            let keepAccount = await accountToKeep(event.sender);
            // Nobody signed in (the sign-in screen): the person restoring names the
            // administrator. Whoever has the backup password can read all of its data anyway;
            // without this only the logins and passwords of the backup would open it, and a
            // forgotten one would lock the restored data away. Checked before anything changes.
            if (!keepAccount) {
                const administrator = request?.administrator;
                if (!administrator || typeof administrator !== 'object') {
                    throw new AppError('VALIDATION', undefined, { field: 'administrator' });
                }
                keepAccount = await newAdministrator(administrator);
            }
            return backups.restoreImport(event.sender.id, { keepAccount });
        },
        { audit: 'backup.restore' },
    );

    // Nobody can sign in any more (passwords and recovery codes forgotten): from the sign-in
    // screen a new administrator starts with an empty data set. Nothing of the current data is
    // shown or deleted — it moves, with the key that reads it, into backups/set-aside — so this
    // gives a stranger at the keyboard nothing that deleting the data folder would not.
    handleResult(
        BACKUP_CHANNELS.startOver,
        access.custom((session) => session === null),
        async (event, input: SetupInput) => {
            checkSetup(input);
            await backups.startOver();
            return setup(event.sender, input);
        },
        { audit: 'system.start-over' },
    );

    handleResult(BACKUP_CHANNELS.getSettings, access.any('backup.export', 'backup.import'), () =>
        settings.read(),
    );

    handleResult(
        BACKUP_CHANNELS.updateSettings,
        access.any('backup.export'),
        async (_event, input: BackupSettingsPatch) => {
            const { remindAfterDays, ...patch } = input ?? {};
            if (
                remindAfterDays !== undefined &&
                !(BACKUP_REMINDER_OPTIONS as readonly number[]).includes(remindAfterDays)
            ) {
                throw new AppError('VALIDATION', undefined, { field: 'remindAfterDays' });
            }
            const next = await settings.update({
                autoBackup: sanitizeAutoBackup(patch),
                ...(remindAfterDays !== undefined ? { remindAfterDays } : {}),
            });
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
