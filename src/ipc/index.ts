import { registerAppIdHandlers } from './appIdHandler';
import { registerAppHandlers } from './appManipulationHandler';
import { authUserHandlers } from './auth/userAuth';
import { registerBackupHandlers } from './backupHandlers';
import { registerChangeHistoryHandler } from './changeHistoryHandler';
import { registerCommentsHandlers } from './commentsUserHandler';
import { registerDirectivesHandler } from './directivesHandler';
import { registerReportsHandlers } from './reportsHandler';
import { registerTodoHandlers } from './todoHandler';
import { registerUserHandlers } from './userHandlers';
import { registertUserHistoryHandlers } from './userHistoryHandler';

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
