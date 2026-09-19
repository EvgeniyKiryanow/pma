import { defineModule, type ModuleContext } from '../app/module';
import { AppPaths } from '../core/paths';
import type { HistoryAttachments } from '../personnel/HistoryAttachments';
import { ChangeExchangeService } from './ChangeExchangeService';
import { ChangeFiles } from './ChangeFiles';
import { ChangeLogFile } from './ChangeLogFile';
import { registerSyncIpc } from './ipc';
import { SentFiles } from './SentFiles';

/** Offline change-log exchange (.pmc). The journal itself is shared infrastructure. */
export function createSyncModule(context: ModuleContext, deps: { files: HistoryAttachments }) {
    const logger = context.createLogger('change-log');
    const exchange = new ChangeExchangeService(
        context.transactor,
        context.journal,
        new ChangeLogFile(() => AppPaths.staging),
        logger,
        new ChangeFiles(deps.files, logger),
        new SentFiles(context.db),
    );
    return defineModule({
        name: 'sync',
        exchange,
        registerIpc: () => registerSyncIpc(exchange),
    });
}
