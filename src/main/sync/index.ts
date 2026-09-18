import { defineModule, type ModuleContext } from '../app/module';
import { AppPaths } from '../core/paths';
import { ChangeExchangeService } from './ChangeExchangeService';
import { ChangeLogFile } from './ChangeLogFile';
import { registerSyncIpc } from './ipc';

/** Offline change-log exchange (.pmc). The journal itself is shared infrastructure. */
export function createSyncModule(context: ModuleContext) {
    const exchange = new ChangeExchangeService(
        context.transactor,
        context.journal,
        new ChangeLogFile(() => AppPaths.staging),
        context.createLogger('change-log'),
    );
    return defineModule({
        name: 'sync',
        exchange,
        registerIpc: () => registerSyncIpc(exchange),
    });
}
