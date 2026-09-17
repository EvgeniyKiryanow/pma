import { registerAppHandlers } from './handlers/appManipulationHandler';
import { registerChangeHistoryHandler } from './handlers/changeHistoryHandler';
import { registerCommentsHandlers } from './handlers/commentsUserHandler';
import { registerDirectivesHandler } from './handlers/directivesHandler';
import { registerReportsHandlers } from './handlers/reportsHandler';
import { registerTodoHandlers } from './handlers/todoHandler';
import { registerUserHandlers } from './handlers/userHandlers';
import { registertUserHistoryHandlers } from './handlers/userHistoryHandler';

/** Feature handlers that predate the service layer. All of them go through `secureHandle`. */
export function registerFeatureHandlers() {
    registerAppHandlers();
    registerUserHandlers();
    registertUserHistoryHandlers();
    registerCommentsHandlers();
    registerDirectivesHandler();
    registerReportsHandlers();
    registerTodoHandlers();
    registerChangeHistoryHandler();
}
