import { registerUserHandlers } from './userHandlers';
import { registerBackupHandlers } from './backupHandlers';
import { authUserHandlers } from './auth/userAuth';
import { registerTodoHandlers } from './todoHandler';
import { registerReportsHandlers } from './reportsHandler';
import { registerDirectivesHandler } from './directivesHandler';
import { registerChangeHistoryHandler } from './changeHistoryHandler';
import { registertUserHistoryHandlers } from './userHistoryHandler';
import { registerAppHandlers } from './appManipulationHandler';
import { registerCommentsHandlers } from './commentsUserHandler';
import { registerAppIdHandlers } from './appIdHandler';

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
