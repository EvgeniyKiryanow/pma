import { registerUserHandlers } from './userHandlers';
import { registerBackupHandlers } from './backupHandlers';
import { authUserHandlers } from './userAuth';
import { registerTodoHandlers } from './todoHandler';

export function registerDbHandlers() {
    authUserHandlers();
    registerUserHandlers();
    registerBackupHandlers();
    registerTodoHandlers();
}
