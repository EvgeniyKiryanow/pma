import { defineModule, type ModuleContext } from '../app/module';
import { registerSystemIpc } from './ipc';
import { AppUpdater } from './updater';

export function createSystemModule(
    context: ModuleContext,
    deps: { hasAccounts: () => Promise<boolean> },
) {
    const logger = context.createLogger('app');
    return defineModule({
        name: 'system',
        registerIpc: () => registerSystemIpc(logger, new AppUpdater(logger), deps.hasAccounts),
    });
}
