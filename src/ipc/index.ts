import { registerUserHandlers } from './userHandlers';
import { registerBackupHandlers } from './backupHandlers';
import { authUserHandlers } from './userAuth';
import { registerTodoHandlers } from './todoHandler';
import { registerReportsHandlers } from './reportsHandler';

export function registerDbHandlers() {
    authUserHandlers();
    registerUserHandlers();
    registerBackupHandlers();
    registerTodoHandlers();
    registerReportsHandlers();
}
