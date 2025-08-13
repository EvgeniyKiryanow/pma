import { registerAppIdHandlers } from './handlers/appIdHandler';
import { registerAppHandlers } from './handlers/appManipulationHandler';
import { authUserHandlers } from './handlers/auth/userAuth';
import { registerBackupHandlers } from './handlers/backupHandlers';
import { registerChangeHistoryHandler } from './handlers/changeHistoryHandler';
import { registerCommentsHandlers } from './handlers/commentsUserHandler';
import { registerDirectivesHandler } from './handlers/directivesHandler';
import { registerReportsHandlers } from './handlers/reportsHandler';
import { registerTodoHandlers } from './handlers/todoHandler';
import { registerUserHandlers } from './handlers/userHandlers';
import { registertUserHistoryHandlers } from './handlers/userHistoryHandler';

export function registerDbHandlers() {
    registerAppIdHandlers();
    authUserHandlers();
    registerUserHandlers();
    registerBackupHandlers();
    registerTodoHandlers();
    registerReportsHandlers();
    registerDirectivesHandler();
    registerChangeHistoryHandler();
    registertUserHistoryHandlers();
    registerAppHandlers();
    registerCommentsHandlers();
}
