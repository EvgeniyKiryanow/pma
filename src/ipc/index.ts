import { registerUserHandlers } from './userHandlers';
import { registerBackupHandlers } from './backupHandlers';

export function registerDbHandlers() {
    registerUserHandlers();
    registerBackupHandlers();
}
